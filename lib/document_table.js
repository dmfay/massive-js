const _ = require("underscore")._;
const assert = require("assert");
const util = require('util');
const Document = require("./document");
const Query = require("./query");
const Where = require("./where");

//Searching query for jsonb docs
exports.searchDoc = function(fields = {}, options = {}) {
  assert(fields.keys && fields.term, "Need the keys to use and the term string");
  options.formatter = Document;

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
    const where = this.getWhereForDoc(fields.where, 1, " AND ");
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
    sql = util.format("update %s set body = $1 where %s = $2 returning *;", this.fullname, pkName);
    params.push(pkVal);
  } else {
    sql = "insert into " + this.fullname + "(body) values($1) returning *;";
  }

  return this.db.query(sql, params, {single : true, formatter: Document});
};

// Only works for jsonb column type and Postgresql 9.5
exports.setAttribute = function(id, key, val){
  if (typeof val === 'string') { val = JSON.stringify(val); }
  if (Array.isArray(val)) { val = JSON.stringify(val); }

  var pkName = this.primaryKeyName();
  var params = ["{"+key+"}", val, id];
  var sql = util.format("update %s set body=jsonb_set(body, $1, $2, true) where %s = $3 returning *;", this.fullname, pkName);
  return this.db.query(sql, params, {single:true, formatter: Document});
};

exports.findDoc = function(conditions = {}, options = {}) {
  var where = this.getWhereForDoc(conditions);
  options.formatter = Document;

  if (where.pkQuery) { options.single = true; }

  const query = new Query(conditions, options, this);

  var sql = query.format(where.where);

  return this.db.query(sql, where.params, options);
};

this.getWhereForDoc = function(conditions, offset, prefix) {
  var where = {pkQuery: false};
  if(_.isFunction(conditions) || conditions == "*") {
    // no criteria provided - treat like select *
    where.where = "";
    where.params = [];
    return where;
  }

  if (Where.isPkSearch(conditions)) {
    //assume it's a search on ID
    conditions = {id : conditions};
  }

  if (_.isObject(conditions)) {
    var keys = _.keys(conditions);

    if (keys.length === 1) {
      var operator = keys[0].match("<=|>=|!=|<>|=|<|>");
      var property = keys[0].replace(operator, "").trim();
      if (property == this.primaryKeyName()) {
        // this is a query against the PK...we can use the
        // plain old table "where" builder:
        where = Where.forTable(conditions, 'predicate', offset, prefix);

        // only a true pk query if testing equality
        if (operator === null || operator === "=") {
          where.pkQuery = true;
        }
      } else {
        where = Where.forTable(conditions, 'docPredicate', offset, prefix);
      }
    } else {
      where = Where.forTable(conditions, 'docPredicate', offset, prefix);
    }
  }

  return where;
};
