var Runner = require("./lib/runner");
var _ = require("underscore")._;
var fs = require("fs");
var Table = require("./lib/table");
var util = require("util");
var assert = require("assert");
var Document = require("./lib/document");
var ArgTypes = require("./lib/arg_types");
var path = require("path");
var self;

var Massive = function(args){
  this.scriptsDir = args.scripts || __dirname + "/db";
  
  var runner = new Runner(args.connectionString);
  _.extend(this,runner);

  this.tables = [];
  this.queryFiles = [];
  //console.log("Massive online", this);
}

Massive.prototype.run = function(){
  var args = ArgTypes.defaultQuery(arguments);
  this.query(args);
}
 
Massive.prototype.loadQueries = function() { 
  walkSqlFiles(this,this.scriptsDir);
};

Massive.prototype.loadTables = function(next){
  var tableSql = __dirname + "/lib/scripts/tables.sql";
  var self = this;
  this.executeSqlFile({file : tableSql}, function(err,tables){
    if(err){
      next(err,null);
    }else{
      _.each(tables, function(table){
        var table = new Table({
          name : table.name,
          pk : table.pk,
          db : self
        });
        //pin to namespace
        self[table.name] =table;
        //add to table collection
        self.tables.push(table);
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
    this.query(sql, function(err,res){
      if(err){
        console.log(err)
        next(err,null);
      }else{
       //add the table
       self[collection] = new Table({
         pk : "id",
         name : collection,
         db : self
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
  sql = util.format(sql, tableName, tableName,tableName);
  return sql;
};


var walkSqlFiles = function(rootObject, rootDir){

  var dirs = fs.readdirSync(rootDir);
  _.each(dirs, function(item){
    var parsed = path.parse(item);

    if(parsed.ext === ".sql"){

      var filePath = path.join(rootDir,item);
      var sql = fs.readFileSync(filePath, {encoding : "utf-8"});

      rootObject[parsed.name] = function(args, next){
        args || (args = {})
        //I have no idea why this works
        var sql = rootObject[parsed.name].sql;
        var db = rootObject[parsed.name].db;
        var params = _.isObject(args) ? args : {params : args};

        db.query(sql,params,{}, next);
      };
      //my god fix this I don't know what I'm doing
      rootObject[parsed.name].sql = sql;
      rootObject[parsed.name].db = self;
      rootObject[parsed.name].filePath = filePath;
      self.queryFiles.push(rootObject[parsed.name]);

    }else if(parsed.ext !== ''){
      //ignore it
    }else{
      //walk it
      rootObject[parsed.name] = {};
      var pathToWalk = path.join(rootDir,item);
      walkSqlFiles(rootObject[parsed.name],pathToWalk);
    }
  });
}

exports.connect = function(args, next){
  assert((args.connectionString || args.db), "Need a connectionString or db name at the very least.");
  //override if there's a db name passed in
  if(args.db){
    args.connectionString = "postgres://localhost/"+args.db;
  }
  var massive = new  Massive(args);

  //load up the tables, queries, and commands
  massive.loadTables(function(err,db){
    self = db;
    assert(!err, err);
    db.loadQueries();
    next(null,db);
  });
};
