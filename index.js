var Runner = require("./lib/runner");
var _ = require("underscore")._;
var fs = require("fs");
var Table = require("./lib/table");
var util = require("util");
var glob = require("glob");
var async = require("async");
var assert = require("assert");

var Massive = function(args){
  this.scriptsDir = args.scripts || __dirname + "/db";
  this.db = new Runner(args.connectionString);
  //console.log("Massive online", this);
}

Massive.prototype.query = function(args,next){
  this.db.query(args, next);
}

Massive.prototype.loadQueries = function(next){

  var sqlFiles = fs.readdirSync(this.scriptsDir);
  var self = this;
  _.each(sqlFiles, function(file){
    if(file.indexOf("sql") > 0){
      var sqlFile = self.scriptsDir + "/" + file;
      var sql = fs.readFileSync(sqlFile, {encoding: 'utf-8'});

      var propName = file.replace(".sql", "");
      self[propName] = function(args,next){
        //I have no idea why this works
        var sql = this[propName].sql;
        var db = this[propName].db;
        if(_.isFunction(args)){
          next = args;
        }
        if(next){
          db.query({sql : sql, params : args}, next);
        }
      }
      //my god fix this I don't know what I'm doing
      self[propName].sql = sql;
      self[propName].db = self.db;
    }
  });
  next(null,self);
};

Massive.prototype.loadTables = function(next){
  var tableSql = __dirname + "/lib/scripts/tables.sql";
  var self = this;
  this.db.executeSqlFile(tableSql, {}, function(err,tables){
    if(err){
      next(err,null);
    }else{
      _.each(tables, function(table){
        self[table.name] = new Table({
          name : table.name,
          pk : table.pk,
          db : self.db
        });
      });
      next(null,self);
    }
  });
}

Massive.prototype.saveDoc = function(collection, doc, next){
  //does the table exist?
  if(!this[collection]){
    var sql = this.documentTableSql(collection);
    var self = this;
    this.db.executeSingle({sql : sql}, function(err,res){
      if(err){
        next(err,null);
      }else{
       //add the table
       self[collection] = new Table({
         pk : "id",
         name : collection,
         db : self.db
       });
       //call save again
       self.saveDoc(collection,doc,next);     
     }
    });
  }else{
    //hand off to the table
    this[collection].saveDoc(doc,next);
  }
};

Massive.prototype.documentTableSql = function(tableName){
  var docSqlFile = __dirname + "/lib/scripts/create_document_table.sql";
  var sql = fs.readFileSync(docSqlFile, {encoding: 'utf-8'});
  sql = util.format(sql, tableName);
  return sql;
};


exports.connect = function(args, next){
  assert(args.connectionString, "Need a connectionString at the very least.");
  var massive = new  Massive(args);
  //load up the tables, queries, and commands
  massive.loadTables(function(err,db){
    assert(!err, err);
    db.loadQueries(next);
  });
};