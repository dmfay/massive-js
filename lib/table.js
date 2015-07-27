var _ = require("underscore")._;
var assert = require("assert");
var clone = require('clone');
var util = require('util');
var DocumentTable = require("./document_table");
var Where = require("./where");
var ArgTypes = require("./arg_types");
var DA = require("deasync");

//a simple wrapper for a table
var Table = function(args){
  this.schema = args.schema;
  this.name = args.name;
  this.pk = args.pk;
  this.db = args.db;

  // Build a fully qualified name if the schema is other than public:
  this.fullname = this.name;
  if(this.schema !== "public") {
    this.fullname = this.schema + "." + this.name;
  }

  // build delimited names in one spot instead of when building sql:
  this.delimitedName = "\"" + this.name + "\"";
  this.delimitedSchema = "\"" + this.schema + "\"";
  this.delimitedFullName = this.delimitedName;

  // if the schema is other than public blah blah...
  if(this.schema !== "public") {
    this.delimitedFullName = this.delimitedSchema + "." + this.delimitedName;
  }
  _.extend(this,DocumentTable);
};

//a simple alias for returning a single record
Table.prototype.findOne = function(args, next){
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
Table.prototype.findOneSync = DA(Table.prototype.findOne);

/**
 * Counts rows and calls back with any error and the total. There are two ways to use this method:
 *
 * 1. find() style: db.mytable.count({field: value}, callback);
 * 2. where() style: db.mytable.count("field=$1", [value], callback);
 */
Table.prototype.count = function() {
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
Table.prototype.countSync = DA(Table.prototype.count);

//a simple way to just run something
//just pass in "id=$1" and the criteria
Table.prototype.where = function(){
  var args = ArgTypes.whereArgs(arguments);

  var sql = "select * from " + this.delimitedFullName + " where " + args.where;
  this.db.query(sql, args.params, args.next);
};
Table.prototype.whereSync = DA(Table.prototype.where);

Table.prototype.find = function(){
  var args = ArgTypes.findArgs(arguments);

  //set default options
  args.options.order || (args.options.order = util.format('"%s"', this.pk));
  args.options.limit || (args.options.limit = "1000");
  args.options.offset || (args.options.offset = "0");
  args.options.columns || (args.options.columns = "*");

  if(_.isFunction(args.conditions)){
    //this is our callback as the only argument, caught by Args.ANY
    args.next = args.conditions;
  }

  var returnSingle = false;
  var where, order, limit, cols="*", offset;

  if(args.options.columns){
    if(_.isArray(args.options.columns)){
      cols = args.options.columns.join(',');
    }else{
      cols = args.options.columns;
    }
  }
  order = " order by " + args.options.order;
  limit = " limit " + args.options.limit;
  offset = " offset " + args.options.offset;

  if(_.isNumber(args.conditions)){
    //a primary key search
    var newArgs = {};
    newArgs[this.primaryKeyName()] = args.conditions;
    args.conditions = newArgs;
    returnSingle = true;
  }

  where = _.isEmpty(args.conditions) ? {where : " "} : Where.forTable(args.conditions);

  var sql = "select " + cols + " from " + this.delimitedFullName + where.where + order + limit + offset;

  if (args.options.stream) {
    this.db.stream(sql, where.params, null, args.next);
  } else {
    this.db.query(sql, where.params, {single : returnSingle}, args.next);
  }
};
Table.prototype.findSync = DA(Table.prototype.find);

Table.prototype.insert = function(data, next) {
  if(!data) throw "insert should be called with data";
  var returnSingle = !_.isArray(data);
  if (returnSingle) { data = [data]; }

  var delimitedColumnNames = _.map(_.keys(data[0]), function(key){return util.format('"%s"', key);});
  var sql = util.format("INSERT INTO %s (%s) VALUES\n", this.delimitedFullName, delimitedColumnNames.join(", "));
  var parameters = [];
  var values = [];
  for(var i = 0, seed = 0; i < data.length; ++i) {
    var v = _.map(data[i], function() { return "$" + (++seed);});
    values.push(util.format('(%s)', v.join(', ')));
    parameters.push(_.values(data[i]));
  }
  sql += values.join(",\n");
  sql += " RETURNING *";
  this.db.query(sql, _.flatten(parameters, true), {single : returnSingle}, next);
};
Table.prototype.insertSync = DA(Table.prototype.insert);

Table.prototype.update = function(conditions, fields, next) {
  var hasConditions = true;
  var options = {};

  if (_.isFunction(fields)) {
    var pkName = this.primaryKeyName();

    hasConditions = false;
    next = fields;
    fields = conditions;
    conditions = {};

    conditions[pkName] = fields[pkName];

    delete fields[pkName];

    options.single = true;
  }

  if(_.isObject(fields) === false) throw "Update requires a hash of fields=>values to update to";

  var parameters = [];
  var f = [];
  var seed = 0;

  _.each(fields, function(value, key) {
    f.push(util.format('"%s" = $%s', key, (++seed)));
    parameters.push(value);
  });

  var sql = util.format("UPDATE %s SET %s", this.delimitedFullName, f.join(', '));

  if (!hasConditions || !_.isEmpty(conditions)) {
    var parsedWhere = Where.forTable(conditions, parameters.length);

    sql += parsedWhere.where;
  }

  sql += " RETURNING *";

  parameters = parameters.concat(_.flatten(_.values(conditions), true));

  this.db.query(sql, parameters, options, next);
};
Table.prototype.updateSync = DA(Table.prototype.update);

Table.prototype.primaryKeyName = function(){
  return this.pk;
};

Table.prototype.delimitedPrimaryKeyName = function() {
  return util.format('"%s"', this.pk);
};

Table.prototype.containsPk = function(args){
  var keys = _.keys(args);
  return (keys.indexOf(this.primaryKeyName()) > -1) || (keys.indexOf(this.delimitedPrimaryKeyName()) > -1);
};

Table.prototype.save = function(args, next){
  assert(_.isObject(args), "Please pass in the criteria for saving as an object. This should include all fields needed to change or add. Include the primary key for an UPDATE.");

  if(this.containsPk(args)){
    this.update(clone(args),next);
  }else{
    this.insert(args,next);
  }
};
Table.prototype.saveSync = DA(Table.prototype.save);

Table.prototype.destroy = function(args, next){
  assert(_.isObject(args), "Please pass in the criteria for deleting. This should be in object format - {id : 1} for example");
  var sql = "delete from " + this.delimitedFullName;
  var where = {};

  if (Object.keys(args).length > 0) {
    where = Where.forTable(args);
    sql += where.where;
  }

  sql += " RETURNING *";
  this.db.query(sql, where.params, next);
};
Table.prototype.destroySync = DA(Table.prototype.destroy);

Table.prototype.search = function(args, next){
  //search expects a columns array and the term
  assert(args.columns && args.term, "Need columns as an array and a term string");

  if(!_.isArray(args.columns)){
    args.columns = [args.columns];
  };
  var tsv;
  var vectorFormat = 'to_tsvector("%s")'
  if(args.columns.length === 1){
    tsv = util.format("%s", args.columns[0])
  }else{
    vectorFormat = 'to_tsvector(%s)'
    tsv= util.format("concat('%s')", args.columns.join(", ', '"));
  }
  var sql = "select * from " + this.delimitedFullName + " where " + util.format(vectorFormat, tsv);
  sql+= " @@ to_tsquery($1);";

  this.db.query(sql, [args.term],next);
};
Table.prototype.searchSync = DA(Table.prototype.search);


module.exports = Table;
