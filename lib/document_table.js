'use strict';

const _ = require('lodash');
const assert = require('assert');
const Query = require('./query/query');
const where = require('./query/where');

/**
 * Perform a full-text search inside the document body.
 *
 * @param {Object} [fields] - Search definition.
 * @param {Array} fields.keys - List of the top-level keys to search.
 * @param {String} fields.term - Search term.
 * @param {Object} [options] - Query options.
 * @return {Promise} All documents matching the search.
 */
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

/**
 * Save a document to the database. This function replaces the entire document
 * body.
 *
 * @param {Object} doc - The document to write.
 * @return {Promise} The updated document.
 */
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

/**
 * Update a document, adding new information and changing existing information.
 * This function can be used with any JSON field, not just document tables.
 *
 * @param {String|Number} id - Primary key of the document or row to modify.
 * @param {Object} changes - Changes to apply.
 * @param {String} [field=body] - Document field name.
 * @return {Promise} If modifying a document table, the document; otherwise, the modified row.
 */
exports.modify = function(id, changes, field = 'body') {
  const pkName = this.primaryKeyName();
  const sql = `update ${this.fullname} set "${field}"="${field}" || $1 where ${pkName} = $2 returning *;`;

  return this.db.query(sql, [JSON.stringify(changes), id], {single: true, document: field === 'body'});
};

/**
 * Find a document by searching in the body.
 *
 * @param {Object|String} [conditions] - A criteria object, prebuilt predicate,
 * or raw ID value.
 * @param {Object} [options] - Query options.
 * @return {Promise} Query results.
 */
exports.findDoc = function(conditions = {}, options = {}) {
  options.document = true;

  return this.find(conditions, options);
};
