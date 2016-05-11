var _ = require("underscore")._;
var assert = require("assert");
var util = require('util');
var Document = require("./document");
var Where = require("./where");
var ArgTypes = require("./arg_types");
var DA = require("deasync");

//Searching query for jsonb docs
exports.searchDoc = function(){
  var args = ArgTypes.searchArgs(arguments, this);
  assert(args.fields.keys && args.fields.term, "Need the keys to use and the term string");
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
  
  var sql = "select * from " + this.fullname + " where " + util.format("to_tsvector(%s)", tsv);
  sql+= " @@ to_tsquery($1)" + args.options.queryOptions();

  this.executeDocQuery(sql, [args.fields.term], args.options, args.next);
};
exports.searchDocSync = DA(this.serchDoc);

exports.saveDoc = function(args, next) {
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
  
  this.executeDocQuery(sql, params, {single : true}, next);
};
exports.saveDocSync = DA(this.saveDoc);

// Only works for jsonb column type and Postgresql 9.5
exports.setAttribute = function(id, key, val, next){
  if (typeof val === 'string') { val = JSON.stringify(val); }

  var pkName = this.primaryKeyName();
  var params = ["{"+key+"}", val, id];
  var sql = util.format("update %s set body=jsonb_set(body, $1, $2, true) where %s = $3 returning *;", this.fullname, pkName);
  this.executeDocQuery(sql, params, {single:true}, next);
};
exports.updateDocSync = DA(this.updateDoc);

exports.findDoc = function() {
  var args = ArgTypes.findArgs(arguments, this);

  var where = this.getWhereForDoc(args.conditions);

  if (where.pkQuery) { args.options.single = true; }

  var sql = util.format("select id, body from %s %s %s", this.fullname, where.where, args.options.queryOptions());
console.log(sql);
  this.executeDocQuery(sql, where.params, args.options, args.next);
};
exports.findDocSync = DA(this.findDoc);

this.getWhereForDoc = function(conditions) {
  var where = {pkQuery: false};
  if(_.isFunction(conditions) || conditions == "*" || Object.keys(conditions).length === 0) {
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
        where = Where.forTable(conditions);

        // only a true pk query if testing equality
        if (operator === null || operator === "=") {
          where.pkQuery = true;
        }
      } else {
        where = Where.forTable(conditions, 'docPredicate');
      }
    } else {
      where = Where.forTable(conditions, 'docPredicate');
    }
  }

  return where;
};

this.executeDocQuery = function() {
  var args = ArgTypes.queryArgs(arguments);
  var doc = {};
  this.db.query(args.sql, args.params, args.options, function(err,res){
    if(err){
      args.next(err,null);
    }else{
      //only return one result if single is sent in
      if(args.options.single){
        doc = Document.formatDocument(res);
      }else{
        doc = Document.formatArray(res);
      }
      args.next(null,doc);
    }
  });
};
