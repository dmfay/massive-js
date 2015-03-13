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

  this.db.query(sql,[args.term],function(err,rows){

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
    sql = util.format("update %s set body = $1 where %s = $2 returning *;",this.fullname, pkName);
    params.push(pkVal);
  }else{
    sql = "insert into " + this.fullname + "(body) values($1) returning *;"
  }

  this.db.query(sql, params, {single : true}, function(err,res){
    if(err){
      next(err,null);
    }else{
      next(null,Document.formatDocument(res));
    }
  });

};

exports.findDoc = function(){
  var args = ArgTypes.findArgs(arguments);
  var sql;
  if(_.isNumber(args.conditions)){
    //assume it's a search on ID
    args.conditions = {id : args.conditions};
  };
  if(this.containsPk(args.conditions)){

    //it's a straight up id query
    sql = util.format("select id, body from %s where id=%d",
      this.fullname, args.conditions[this.primaryKeyName()]);

    this.db.query(sql,[], {single :true}, function(err,res){
      if(err){
        args.next(err,null);
      }else{
        var doc = Document.formatDocument(res);
        args.next(null,doc);
      }
    });
  }else{

    var where = Where.forDocument(args.conditions);
    sql = util.format("select id, body from %s ",this.fullname);
    sql+= where.where; 
    
    this.db.query(sql, where.params, function(err,results){
      if(err){
        args.next(err,null);
      }else{
        //loop the results and push the id back in
        args.next(null,Document.formatArray(results));
      }
    });
  }
};

