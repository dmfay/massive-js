const _ = require("underscore")._;
const assert = require("assert");
const Query = require("./query");
const Where = require("./where");

//Searching query for jsonb docs
exports.searchDoc = function(fields = {}, options = {}) {
  assert(fields.keys && fields.term, "Need the keys to use and the term string");

  options.document = true;

  var params = [fields.term], tsv;

  //yuck full repetition here... fix me...
  if (!_.isArray(fields.keys)) { fields.keys = [fields.keys]; }

  if(fields.keys.length === 1){
    tsv = `(body ->> '${fields.keys[0]}')`;
  } else {
    var formattedKeys = [];
    _.each(fields.keys, function(key){
      formattedKeys.push(`(body ->> '${key}')`);
    });
    tsv = `concat(${formattedKeys.join(", ' ',")})`;
  }

  const conditions = {
    where: `to_tsvector(${tsv}) @@ to_tsquery($1) `,
    params: params
  };

  if (fields.where) {
    const where = Where.forDocument(fields.where, 1, " AND ");
    conditions.where += where.where;
    conditions.params = conditions.params.concat(where.params);
  }

  return this.db.query(new Query(conditions, options, this));
};

exports.saveDoc = function(doc) {
  assert(_.isObject(doc), "Please pass in the document for saving as an object. Include the primary key for an UPDATE.");
  var sql, params = [];
  var pkName = this.primaryKeyName();
  var pkVal = doc[pkName];

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
exports.setAttribute = function(id, key, val){
  if (typeof val === 'string') { val = JSON.stringify(val); }
  if (Array.isArray(val)) { val = JSON.stringify(val); }

  var pkName = this.primaryKeyName();
  var params = ["{"+key+"}", val, id];
  var sql = `update ${this.fullname} set body=jsonb_set(body, $1, $2, true) where ${pkName} = $3 returning *;`;
  return this.db.query(sql, params, {single: true, document: true});
};

exports.findDoc = function(conditions = {}, options = {}) {
  options.document = true;

  return this.db.query(new Query(conditions, options, this));
};
