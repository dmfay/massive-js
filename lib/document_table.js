var _ = require("underscore")._;
var assert = require("assert");
var util = require('util');
var Document = require("./document");
var Where = require("./where");
var ArgTypes = require("./arg_types");

//Searching query for jsonb docs
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
  var sql = "select * from " + this.fullname + " where " + util.format("to_tsvector(%s)", tsv);
  sql+= " @@ to_tsquery($1);";

  this.executeDocQuery(sql, [args.term], next);
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
    sql = util.format("update %s set body = $1 where %s = $2 returning *;",this.fullname, pkName);
    params.push(pkVal);
  }else{
    sql = "insert into " + this.fullname + "(body) values($1) returning *;"
  }
  this.executeDocQuery(sql, params, {single : true}, next)
};

exports.findDoc = function(){
  var args = ArgTypes.findArgs(arguments);
  if(_.isFunction(args.conditions)){ 
    // all we're given is the callback:
    args.next = args.conditions;
  }

  // Set up the WHERE statement:
  var where = this.getWhereForDoc(args.conditions);
  var sql = util.format("select id, body from %s", this.fullname);
  sql += where.where; 
  if(where.pkQuery) { 
    this.executeDocQuery(sql, [], {single:true}, args.next);
  } else {
    this.executeDocQuery(sql, where.params,args.options, args.next);
  }
};

this.getWhereForDoc = function(conditions) { 
  var where = {};
  if(_.isFunction(conditions) || conditions == "*") { 
    // no crtieria provided - treat like select *
    where.where = "";
    where.params = [];
    where.pkQuery = false;
    return where;
  }
  
  if(_.isNumber(conditions)){
    //assume it's a search on ID
    conditions = {id : conditions};
  };

  if(_.isObject(conditions)) {
    var keys = _.keys(conditions);
    if(keys.length = 1) { 
      var operator = keys[0].match("<=|>=|!=|<>|=|<|>");
      var property = keys[0].replace(operator, "").trim();
      if(property == this.primaryKeyName()) { 
        // this is a query against the PK...we can use the 
        // plain old table "where" builder:
        where = Where.forTable(conditions);
        where.pkQuery = true;
        if(operator != null && operator != "=") { 
          // someone passed an operator as part of the key, such as "id >" : 1 
          // this will likely return more than one result:
          where.pkQuery = false;
        }
      } else {
        var where = Where.forDocument(conditions);
        where.pkQuery = false; 
      }
    } else { 
      var where = Where.forDocument(conditions);
      where.pkQuery = false;  
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

