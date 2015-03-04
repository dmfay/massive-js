var _ = require("underscore")._;
var assert = require("assert");
var util = require('util');
var Document = require("./document");
var Where = require("./where");

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

  this.db.query({sql : sql,params : args.term},function(err,rows){
    if(err){
      next(err, null);
    }else{
      next(null, Document.formatArray(rows));
    }
  });
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
      next(null,Document.formatDocument(res));
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
        next(null,Document.formatDocument(res));
      }
    });
  }else{

    var where = Where.forDocument(args);
    sql = util.format("select id, body from %s ",this.name);
    sql+= where.where; 
    
    var cmd = {sql : sql, params : where.params};

    this.db.query(cmd, function(err,results){
      if(err){next(err,null);}
      else{
        //loop the results and push the id back in
        next(null,Document.formatArray(results));
      }
    });
  }
};

