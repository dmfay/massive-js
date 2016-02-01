var _ = require("underscore")._;
var assert = require("assert");
var util = require('util');
var Entity = require('./entity');
var Where = require("./where");
var ArgTypes = require("./arg_types");
var DA = require("deasync");

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
Queryable.prototype.findOne = function(args, next){
  if(_.isFunction(args)){
    next = args;
    args = {};
  }

  this.find(args, function(err,results){
    if(err){
      next(err,null);
    }else{
      var result;

      if (_.isArray(results)) {
        if (results.length > 0) { result = results[0]; }
      } else {
        result = results;
      }

      next(null,result);
    }
  });
};
Queryable.prototype.findOneSync = DA(Queryable.prototype.findOne);

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
    args = ArgTypes.findArgs(arguments);
    where = _.isEmpty(args.conditions) ? {where : " "} : Where.forTable(args.conditions);
  } else {
    args = ArgTypes.whereArgs(arguments);
    where = {where: " where " + args.where};
  }

  var sql = "select COUNT(1) from " + this.delimitedFullName + where.where;

  this.db.query(sql, where.params || args.params, {single : true}, function(err, res) {
    if (err) args.next(err, null);
    else args.next(null, res.count);
  });
};
Queryable.prototype.countSync = DA(Queryable.prototype.count);

//a simple way to just run something
//just pass in "id=$1" and the criteria
Queryable.prototype.where = function(){
  var args = ArgTypes.whereArgs(arguments);

  var sql = "select * from " + this.delimitedFullName + " where " + args.where;
  this.db.query(sql, args.params, args.next);
};
Queryable.prototype.whereSync = DA(Queryable.prototype.where);

Queryable.prototype.find = function(){
  var args = ArgTypes.findArgs(arguments);

  //set default options
  //if our inheriting object defines a primary key use that as the default order
  var options = _.extend({
    order: (this.hasOwnProperty("pk") ? util.format('"%s"', this.pk) : "1"),
    columns: "*"
  }, args.options);

  if (_.isFunction(args.conditions)) {
    //this is our callback as the only argument, caught by Args.ANY
    args.next = args.conditions;
  }

  var returnSingle = false;
  var cols = "*";

  if (options.columns) {
    if (_.isArray(options.columns)) {
      cols = options.columns.join(',');
    } else {
      cols = options.columns;
    }
  }

  if (_.isNumber(args.conditions) || _.isString(args.conditions)) {
    //a primary key search
    var newArgs = {};
    newArgs[this.primaryKeyName()] = args.conditions;
    args.conditions = newArgs;
    returnSingle = true;
  }

  var where = _.isEmpty(args.conditions) ? {where: " "} : Where.forTable(args.conditions);

  var sql = "select " + cols + " from " + this.delimitedFullName + where.where;
  sql += " order by " + options.order;
  if (options.limit) {
    sql += " limit " + options.limit;
  }
  if (options.offset) {
    sql += " offset " + options.offset;
  }

  if (args.options.stream) {
    this.db.stream(sql, where.params, null, args.next);
  } else {
    this.db.query(sql, where.params, {single: returnSingle}, args.next);
  }
};
Queryable.prototype.findSync = DA(Queryable.prototype.find);

Queryable.prototype.search = function(args, next){
  //search expects a columns array and the term
  assert(args.columns && args.term, "Need columns as an array and a term string");

  if(!_.isArray(args.columns)){
    args.columns = [args.columns];
  }

  var tsv;
  var vectorFormat = 'to_tsvector("%s")';
  if(args.columns.length === 1){
    tsv = util.format("%s", args.columns[0]);
  }else{
    vectorFormat = 'to_tsvector(%s)';
    tsv= util.format("concat('%s')", args.columns.join(", ', '"));
  }
  var sql = "select * from " + this.delimitedFullName + " where " + util.format(vectorFormat, tsv);
  sql+= " @@ to_tsquery($1);";

  this.db.query(sql, [args.term],next);
};
Queryable.prototype.searchSync = DA(Queryable.prototype.search);

module.exports = Queryable;
