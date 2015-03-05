var _ = require("underscore")._;
var assert = require("assert");
var util = require('util');
var DocumentTable = require("./document_table");
var Where = require("./where");
var Args = require("args-js");

//a simple wrapper for a table
var Table = function(args){
  this.name = args.name;
  this.pk = args.pk;
  this.db = args.db;

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
      var result = (_.isArray(results) && results.length > 0) ? results[0] : results;
      next(null,result);
    }
  });
};

Table.prototype.find = function(){

  var args = Args([
    {conditions : Args.ANY | Args.Optional, _default : {}},
    {options : Args.OBJECT | Args.Optional, _default : {}},
    {next : Args.FUNCTION | Args.Optional, _default : function(err,res){
      if(err) console.log(err)
      else console.log(res)
    }}
  ], arguments);

  //set default options
  args.options.order || (args.options.order = util.format('"%s"', this.pk));
  args.options.limit || (args.options.limit = "1000");
  args.options.offset || (args.options.offset = "0");
  args.options.columns || (args.options.columns = "*");

  if(_.isFunction(args.conditions)){
    //this is our callback as the only argument, caught by Args.ANY
    args.next = args.conditions;
  };

  var returnSingle = false;
  var where, order, limit, cols="*", offset;

  if(args.options.columns){
    if(_.isArray(args.options.columns)){
      cols = util.format('"%s"', args.options.columns.join('","'));
    }else{
      if (cols != "*") {
        cols = util.format('"%s"', args.options.columns);
      }
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

  var sql = "select " + cols + " from " + util.format('"%s"',this.name) + where.where + order + limit + offset;
  this.db.query(sql, where.params, {single : returnSingle}, args.next);
};


Table.prototype.insert = function(data, next) {
  if(!data) throw "insert should be called with data";
  if (!_.isArray(data)) { data = [data]; }

  var sql = util.format("INSERT INTO %s (%s) VALUES\n", this.name, _.keys(data[0]).join(", "));
  var parameters = [];
  var values = []
  for(var i = 0, seed = 0; i < data.length; ++i) {
    var v = _.map(data[i], function() { return "$" + (++seed);});
    values.push(util.format('(%s)', v.join(', ')));
    parameters.push(_.values(data[i]));
  }
  sql += values.join(",\n");
  sql += " RETURNING *";
  this.db.query(sql, _.flatten(parameters), {single : true}, next);
};

Table.prototype.update = function(fields, where, next){
  if(_.isObject(fields) === false) throw "Update requires a hash of fields=>values to update to";

  var parameters = [];
  var f = [];
  var seed = 0;
  _.each(fields, function(value, key) {
    f.push(key + ' = ' + "$" + (++seed));
    parameters.push(value);
  });
  var parsedWhere = parseWhere(where);
  var sql = util.format("UPDATE %s SET %s", this.name, f.join(', '));
  sql += parsedWhere.where;
  sql += " RETURNING *";

  this.db.query(sql, parameters, next)
};

Table.prototype.primaryKeyName = function(){
  return this.pk;
};
Table.prototype.containsPk = function(args){
  return _.keys(args).indexOf(this.primaryKeyName()) > -1;
};
Table.prototype.save = function(args, next){
  assert(_.isObject(args), "Please pass in the criteria for saving as an object. This should include all fields needed to change or add. Include the primary key for an UPDATE.");
  //see if the args contains a PK
  var self = this;
  if(this.containsPk(args)){
    var pk = this.primaryKeyName();
    //it's an update, use the id to run it
    var where = {};
    where[pk] = args[pk];
    delete args[pk];
    this.update(args,where,next);
  }else{
    this.insert(args,next);
  }
};

Table.prototype.destroy = function(args, next){
  assert(_.isObject(args), "Please pass in the criteria for deleting. This should be in object format - {id : 1} for example");
  var sql = "delete from " + this.name;
  var where = parseWhere(args);
  sql += where.where;
  sql += " RETURNING *";
  this.db.query(sql, where.params, next);
};

Table.prototype.search = function(args, next){
  //search expects a columns array and the term
  assert(args.columns && args.term, "Need columns as an array and a term string");
  
  if(!_.isArray(args.columns)){
    args.columns = [args.columns];
  };
  var tsv;
  if(args.columns.length === 1){
    tsv = util.format("%s", args.columns[0])
  }else{
    tsv= util.format("concat(%s)", args.columns.join(", ' ',"));
  }
  var sql = "select * from " + this.name + " where " + util.format("to_tsvector(%s)", tsv);
  sql+= " @@ to_tsquery($1);";

  this.db.query(sql, args.term,next);
};


module.exports = Table;

