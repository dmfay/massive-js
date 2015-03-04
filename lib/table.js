var _ = require("underscore")._;
var assert = require("assert");
var util = require('util');
var async = require('async');

//a simple wrapper for a table
var Table = function(args){
  this.name = args.name;
  this.pk = args.pk;
  this.db = args.db;
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

Table.prototype.find = function(args,next){
  var returnSingle = false;

  if(_.isFunction(args)){
    next = args;
    args = {};
  }
  if(_.isNumber(args)){
    //a primary key search
    var newArgs = {};
    newArgs[this.primaryKeyName()] = args;
    args = newArgs;
    returnSingle = true;
  }
  var where, order, limit, cols, params;
  var cols = "*";
  if(args.columns){
    if(_.isArray(args.columns)){
      cols = args.columns.join(",");
    }else{
      cols = args.columns;
    }
  }

  where = _.isEmpty(args) ? {where : ""} : parseWhere(args);
  order = args.order ?  " ORDER BY " + args.order : " ORDER BY " + this.pk;
  limit = args.limit ? " LIMIT " + args.limit : "";
  params = args.params || [];

  var sql = "select " + cols + " from " + this.name + where.where + order + limit;
  var cmd = {sql : sql, params : where.params || []};

  if(returnSingle){
    this.db.executeSingle(cmd, next);
  }else{
    this.db.query(cmd, next);
  }
};

var operationsMap = {'=': '=', '!': '!=', '>': '>', '<': '<', '>=': '>=', '<=': '<=', '!=' : '<>', '<>': '<>'};

var parseWhere = function(conditions) {
  var _conditions = [], result = {};
  result.params = [];
  _.each(conditions, function(value, key) {
    var parts = key.trim().split(/ +/);
    var property = parts[0];
    var operation = operationsMap[parts[1]] || '=';

    if (_.isBoolean(value) || _.isNumber(value)) {
      return _conditions.push(util.format('"%s" %s %d', property, operation, value));
    }

    if (!_.isArray(value)) {
      result.params.push(value);
      return _conditions.push(util.format('"%s" %s %s', property, operation, "$" + (result.params.length)));
    }

    var arrayConditions = [];
    _.each(value, function(v) {
      result.params.push(v);
      arrayConditions.push("$" + (result.params.length));
    });
    _conditions.push(util.format('"%s" %s (%s)', property, operation == '!=' || operation == '<>' ? 'NOT IN' : 'IN', arrayConditions.join(', ')));
  });

  result.where =  ' \nWHERE ' + _conditions.join(' \nAND ');
  return result;
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
  this.db.executeSingle({sql : sql, params : _.flatten(parameters)}, next);
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
  var cmd = {sql : sql, params : parameters};
  this.db.query(cmd, next)
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
  this.db.query({sql : sql, params : where.params}, next);
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

  this.db.query({
    sql : sql,
    params : args.term
  },next);
};

Table.prototype.searchDoc = function(args, next){
  assert(args.keys && args.term, "Need the keys to use and the term string");
  
  //yuck full repetition here... fix me...
  if(!_.isArray(args.keys)){
    args.keys = [args.keys];
  };
  var tsv;
  if(args.keys.length === 1){
    tsv = util.format("(body ->> '%s')", args.keys[0])
  }else{
    var formattedKeys = [];
    _.each(args.keys, function(key){
      formattedKeys.push(util.format("(body ->> '%s')", key));
    });
    tsv= util.format("concat(%s)", formattedKeys.join(", ' ',"));
  }
  var sql = "select * from " + this.name + " where " + util.format("to_tsvector(%s)", tsv);
  sql+= " @@ to_tsquery($1);";

  this.db.query({
    sql : sql,
    params : args.term
  },next);
};

Table.prototype.saveDoc = function(args, next){
  assert(_.isObject(args), "Please pass in the document for saving as an object. Include the primary key for an UPDATE.");
  //see if the args contains a PK
  var self = this;
  var sql, params = [];
  var pkName = this.primaryKeyName();
  var pkVal = args[pkName];
  
  //just in case
  delete args[pkName];
  //only do this after the pk is removed
  params.push(JSON.stringify(args));
  if(pkVal){
    sql = util.format("update %s set body = $1 where %s = $2 returning *;",this.name, pkName);
    params.push(pkVal);
  }else{
    sql = "insert into " + this.name + "(body) values($1) returning *;"
  }
  var cmd = {sql : sql, params : params};
  this.db.executeSingle(cmd, next);

};

Table.prototype.findDoc = function(args, next){
  var sql;
  if(_.isNumber(args)){
    //assume it's a search on ID
    args = {id : args};
  };
  if(this.containsPk(args)){
    //it's a straight up id query
    sql = util.format("select id, body from %s where id=%d",
      this.name, args[this.primaryKeyName()]);

    this.db.executeSingle({sql : sql}, function(err,res){
      if(err){next(err,null);}
      else{
        var resultBody = res.body;
        //add the id back in because it's stripped on save
        resultBody.id = res.id;
        next(null,resultBody);
      }
    });
  }else{
    var where = docWhereParser(args);
    sql = util.format("select id, body from %s ",this.name);
    sql+= where.where; 
    
    var cmd = {sql : sql, params : where.params};

    this.db.query(cmd, function(err,results){
      if(err){next(err,null);}
      else{
        //loop the results and push the id back in
        var docResults = [];
        _.each(results,function(res){
          var doc = res.body;
          doc.id = res.id;
          docResults.push(doc);
        });
        next(null,docResults);
      }
    });
  }
};

//hideous repetition here! But it works...
var docWhereParser = function(conditions) {
  var _conditions = [], result = {};
  result.params = [];

  _.each(conditions, function(value, key) {
    var parts = key.trim().split(/ +/);
    var property = parts[0];
    var operation = operationsMap[parts[1]] || '=';


    //if we have an array of objects, this is a deep traversal
    if(_.isArray(value) && _.isObject(value[0])){
      result.params.push(JSON.stringify(conditions));
      return _conditions.push(util.format("body @> %s", "$" + (result.params.length)));
    };

    //if we have equality here, just use a JSON contains
    if(operation === '=' && !_.isArray(value)){
      //parse the value into stringy JSON
      var param = {};
      param[key]=value;
      result.params.push(JSON.stringify(param));
      return _conditions.push(util.format("body @> %s", "$" + (result.params.length)));
    }

    //comparison stuff
    if (_.isBoolean(value)){
      return _conditions.push(util.format("(body ->> '%s')::boolean %s %s", property, operation, value));
    }else if(_.isDate(value)) {
      result.params.push(value);
      return _conditions.push(util.format("(body ->> '%s')::timestamp %s $%d", property, operation, result.params.length));

    }else if(_.isNumber(value)) {
      return _conditions.push(util.format("(body ->> '%s')::decimal %s %d", property, operation, value));
    }

    //anything non-array handling
    if (!_.isArray(value)) {
      result.params.push(value);
      return _conditions.push(util.format("(body ->> '%s') %s %s", property, operation, "$" + (result.params.length)));
    }

    var arrayConditions = [];

    _.each(value, function(v) {
      result.params.push(v);
      arrayConditions.push("$" + (result.params.length));      
    });
    _conditions.push(util.format("(body ->> '%s') %s (%s)", property, operation == '!=' || operation == '<>' ? 'NOT IN' : 'IN', arrayConditions.join(', ')));
  });

  result.where =  ' \nWHERE ' + _conditions.join(' \nAND ');
  return result;
};


module.exports = Table;

