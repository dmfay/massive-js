var _ = require("underscore")._;
var assert = require("assert");
var util = require('util');
var operationsMap = require("./operations_map");

exports.searchDoc = function(args, next){
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

exports.saveDoc = function(args, next){
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
  this.db.executeSingle(cmd, function(err,res){
    if(err){
      next(err,null);
    }else{
      //we have a document record back, so pass on the body etc
      //TODO: So repetitious...fix this...
      var returnDoc = res.body;
      returnDoc.id = res.id;
      next(null,returnDoc);
    }
  });

};

exports.findDoc = function(args, next){
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
