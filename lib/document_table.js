'use strict';

const _ = require('lodash');
const assert = require('assert');
const Query = require('./query/query');
const where = require('./query/where');

//Searching query for jsonb docs
exports.searchDoc = function(fields = {}, options = {}) {
  assert(fields.keys && fields.term, "Need the keys to use and the term string");

  options.document = true;

  let params = [fields.term], tsv;

  //yuck full repetition here... fix me...
  if (!_.isArray(fields.keys)) { fields.keys = [fields.keys]; }

  if(fields.keys.length === 1){
    tsv = `(body ->> '${fields.keys[0]}')`;
  } else {
    const formattedKeys = [];
    _.each(fields.keys, function(key){
      formattedKeys.push(`(body ->> '${key}')`);
    });
    tsv = `concat(${formattedKeys.join(", ' ',")})`;
  }

  const criteria = where(fields.where, 1, ' AND ', 'docGenerator');
  const conditions = {
    conditions: `to_tsvector(${tsv}) @@ to_tsquery($1) ${criteria.conditions}`,
    params: params.concat(criteria.params)
  };

  return this.db.query(new Query(conditions, options, this));
};

exports.saveDoc = function(doc) {
  assert(_.isObject(doc), "Please pass in the document for saving as an object. Include the primary key for an UPDATE.");

  if (this.validate) { this.validate(doc); }

  let sql, params = [];
  const pkName = this.primaryKeyName();
  const pkVal = doc[pkName];

  // if there's a primary key, don't store it in the body as well
  params.push(JSON.stringify(_.omit(doc, pkName)));

  if (pkVal) {
    sql = `update ${this.fullname} set body = $1 where ${pkName} = $2 returning *;`;
    params.push(pkVal);
  } else {
    sql = `insert into ${this.fullname} (body) values($1) returning *;`;
  }

  return this.db.query(sql, params, {single: true, document: true});
};

// Only works for jsonb column type and Postgresql 9.5
exports.setAttribute = function(id, key, val) {
  if (typeof val === 'string' || _.isArray(val)) {
    val = JSON.stringify(val);
  } else if (val) {
    val = val.toString();
  }

  const pkName = this.primaryKeyName();
  const params = [`{${key}}`, val, id];
  const sql = `update ${this.fullname} set body=jsonb_set(body, $1, $2, true) where ${pkName} = $3 returning *;`;
  return this.db.query(sql, params, {single: true, document: true});
};

exports.findDoc = function(conditions = {}, options = {}) {
  options.document = true;

  return this.find(conditions, options);
};
