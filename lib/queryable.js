var _ = require("underscore")._;
var assert = require("assert");
var util = require('util');
var Entity = require('./entity');
var Where = require("./where");
var ArgTypes = require("./arg_types");

/**
 * Represents a queryable database entity (table or view).
 * @param {[type]} args [description]
 */
var Queryable = function() {
  Entity.apply(this, arguments);

  // create delimited names now instead of at query time
  this.delimitedName = "\"" + this.name + "\"";
  this.delimitedSchema = "\"" + this.schema + "\"";

  // handle naming when schema is other than public:
  if(this.schema !== "public") {
    this.fullname = this.schema + "." + this.name;
    this.delimitedFullName = this.delimitedSchema + "." + this.delimitedName;
  } else {
    this.fullname = this.name;
    this.delimitedFullName = this.delimitedName;
  }
};

util.inherits(Queryable, Entity);

//a simple alias for returning a single record
Queryable.prototype.findOne = function() {
  var args = ArgTypes.findArgs(arguments, this);

  return this.find(args.conditions, args.query).then(results => {
    if (results.length > 0) { return Promise.resolve(results[0]); }

    return Promise.resolve(results);
  });
};

/**
 * Counts rows and calls back with any error and the total. There are two ways to use this method:
 *
 * 1. find() style: db.mytable.count({field: value}, callback);
 * 2. where() style: db.mytable.count("field=$1", [value], callback);
 */
Queryable.prototype.count = function() {
  var args;
  var where;

  if (_.isObject(arguments[0])) {
    args = ArgTypes.findArgs(arguments, this);
    where = _.isEmpty(args.conditions) ? {where : " "} : Where.forTable(args.conditions);
  } else {
    args = ArgTypes.whereArgs(arguments, this);
    where = {where: " where " + args.where};
  }

  args.query.columns = "COUNT(1)";
  args.query.order = null;
  var sql = args.query.format(where.where);

  return this.db.query(sql, where.params || args.params, {single : true}).then(res => Promise.resolve(res.count));
};

//a simple way to just run something
//just pass in "id=$1" and the criteria
Queryable.prototype.where = function(){
  var args = ArgTypes.whereArgs(arguments, this);

  var sql = args.query.format("where " + args.where);

  return this.db.query(sql, args.params);
};

Queryable.prototype.find = function() {
  var args = ArgTypes.findArgs(arguments, this);

  if (typeof this.primaryKeyName === 'function' && Where.isPkSearch(args.conditions)) {
    var newArgs = {};
    newArgs[this.primaryKeyName()] = args.conditions;
    args.conditions = newArgs;
    args.query.single = true;
  }

  var where = _.isEmpty(args.conditions) ? {where: " "} : Where.forTable(args.conditions);
  var sql = args.query.format(where.where);

  return this.db.query(sql, where.params, args.query);
};

Queryable.prototype.search = function(){
  var args = ArgTypes.searchArgs(arguments, this);

  //search expects a columns array and the term
  assert(args.fields.columns && args.fields.term, "Need columns as an array and a term string");
  var params = [args.fields.term];
  if(!_.isArray(args.fields.columns)){
    args.fields.columns = [args.fields.columns];
  }
  var tsv;
  var vectorFormat = 'to_tsvector("%s")';
  if(args.fields.columns.length === 1){
    tsv = util.format("%s", args.fields.columns[0]);
    if(args.fields.columns[0].indexOf('>>') !== -1){
      vectorFormat = 'to_tsvector(%s)';
    }
  }else{
    vectorFormat = 'to_tsvector(%s)';
    tsv= util.format("concat(%s)", args.fields.columns.join(", ' ', "));
  }

  var whereString = "";
  if (args.fields.where) {
    var where = Where.forTable(args.fields.where, 'predicate', 1, " AND ");
    whereString = where.where;
    params = params.concat(where.params);
  }
  var sql = args.query.format(util.format(" WHERE " + vectorFormat + " @@ to_tsquery($1) %s", tsv, whereString));
  return this.db.query(sql, params, args.options);
};

module.exports = Queryable;
