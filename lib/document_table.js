const _ = require("underscore")._;
const assert = require("assert");
const util = require('util');
const Document = require("./document");
const Where = require("./where");
const ArgTypes = require("./arg_types");

//Searching query for jsonb docs
exports.searchDoc = function() {
  var args = ArgTypes.searchArgs(arguments, this);
  assert(args.fields.keys && args.fields.term, "Need the keys to use and the term string");
  var params = [args.fields.term];
  //yuck full repetition here... fix me...
  if(!_.isArray(args.fields.keys)){
    args.fields.keys = [args.fields.keys];
  }
  var tsv;
  if(args.fields.keys.length === 1){
    tsv = util.format("(body ->> '%s')", args.fields.keys[0]);
  }else{
    var formattedKeys = [];
    _.each(args.fields.keys, function(key){
      formattedKeys.push(util.format("(body ->> '%s')", key));
    });
    tsv= util.format("concat(%s)", formattedKeys.join(", ' ',"));
  }

  var whereString = "";

  if (args.fields.where) {
    var where = this.getWhereForDoc(args.fields.where, 1, " AND ");
    whereString = where.where;
    params = params.concat(where.params);
  }

  var sql = args.query.format(util.format(" WHERE to_tsvector(%s) @@ to_tsquery($1) %s", tsv, whereString));

  return this.executeDocQuery(sql, params, args.options);
};

exports.saveDoc = function(args) {
  assert(_.isObject(args), "Please pass in the document for saving as an object. Include the primary key for an UPDATE.");
  var sql, params = [];
  var pkName = this.primaryKeyName();
  var pkVal = args[pkName];

  // if there's a primary key, don't store it in the body as well
  params.push(JSON.stringify(_.omit(args, pkName)));

  if (pkVal) {
    sql = util.format("update %s set body = $1 where %s = $2 returning *;", this.fullname, pkName);
    params.push(pkVal);
  } else {
    sql = "insert into " + this.fullname + "(body) values($1) returning *;";
  }

  return this.executeDocQuery(sql, params, {single : true});
};

// Only works for jsonb column type and Postgresql 9.5
exports.setAttribute = function(id, key, val){
  if (typeof val === 'string') { val = JSON.stringify(val); }
  if (Array.isArray(val)) { val = JSON.stringify(val); }

  var pkName = this.primaryKeyName();
  var params = ["{"+key+"}", val, id];
  var sql = util.format("update %s set body=jsonb_set(body, $1, $2, true) where %s = $3 returning *;", this.fullname, pkName);
  return this.executeDocQuery(sql, params, {single:true});
};

exports.findDoc = function() {
  var args = ArgTypes.findArgs(arguments, this);

  var where = this.getWhereForDoc(args.conditions);

  if (where.pkQuery) { args.options.single = true; }

  var sql = args.query.format(where.where);

  return this.executeDocQuery(sql, where.params, args.options);
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

this.executeDocQuery = function() {
  var args = ArgTypes.queryArgs(arguments);
  var doc = {};
  return this.db.query(args.sql, args.params, args.options).then(res => {
    //only return one result if single is sent in
    if (args.options.single) {
      doc = Document.formatDocument(res);
    } else {
      doc = Document.formatArray(res);
    }

    return Promise.resolve(doc);
  });
};
