var Runner = require("./lib/runner");
var _ = require("underscore")._;
var fs = require("fs");
var Table = require("./lib/table");
var util = require("util");
var assert = require("assert");
var Document = require("./lib/document");
var ArgTypes = require("./lib/arg_types");
var Args = require("args-js");
var path = require("path");
var self;

var Massive = function(args){

  this.scriptsDir = args.scripts || process.cwd() + "/db";
  
  var runner = new Runner(args.connectionString);
  _.extend(this,runner);

  this.tables = [];
  this.queryFiles = [];
  //console.log("Massive online", this);
}

Massive.prototype.run = function(){
  var args = ArgTypes.queryArgs(arguments);
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

//A recursive directory walker that would love to be refactored
var walkSqlFiles = function(rootObject, rootDir){
  var dirs = fs.readdirSync(rootDir);
  
  //loop the directories found
  _.each(dirs, function(item){

    //parsing with path is a friendly way to get info about this dir or file
    var parsed = path.parse(item);

    //is this a SQL file?
    if(parsed.ext === ".sql"){

      //why yes it is! Build the abspath so we can read the file
      var filePath = path.join(rootDir,item);

      //pull in the SQL - don't worry this only happens once, when
      //massive is loaded using connect()
      var sql = fs.readFileSync(filePath, {encoding : "utf-8"});

      //set a property on our root object, and grab a handy variable reference:
      var newProperty = assignScriptAsFunction(rootObject, parsed.name);

      //I don't know what I'm doing, but it works
      newProperty.sql = sql;
      newProperty.db = self;
      newProperty.filePath = filePath;
      self.queryFiles.push(newProperty);

    }else if(parsed.ext !== ''){
      //ignore it
    }else{

      //this is a directory so shift things and move on down
      //set a property on our root object, then use *that*
      //as the root in the next call
      rootObject[parsed.name] = {};

      //set the path to walk so we have a correct root directory
      var pathToWalk = path.join(rootDir,item);

      //recursive call - do it all again
      walkSqlFiles(rootObject[parsed.name],pathToWalk);
    }
  });
}

var assignScriptAsFunction = function (rootObject, propertyName) { 
   rootObject[propertyName] = function(args, next) { 
    args || (args = {});
    //if args is a function, it's our callback
    if(_.isFunction(args)){
      next = args;
      //set args to an empty array
      args = [];
    }
    //JA - use closure to assign stuff from properties before they are invented 
    //(sorta, I think...):
    var sql = rootObject[propertyName].sql;
    var db = rootObject[propertyName].db;
    var params = _.isArray(args) ? args : [args];

    //execute the query on invocation
    db.query(sql,params,{}, next);  
  }
  return rootObject[propertyName];
}

//connects Massive to the DB
exports.connect = function(args, next){
  assert((args.connectionString || args.db), "Need a connectionString or db (name of database on localhost) at the very least.");
  
  //override if there's a db name passed in
  if(args.db){
    args.connectionString = "postgres://localhost/"+args.db;
  }

  var massive = new  Massive(args);

  //load up the tables, queries, and commands
  massive.loadTables(function(err,db){
    self = db;
    assert(!err, err);
    //synchronous
    db.loadQueries();
    next(null,db);
  });
};
