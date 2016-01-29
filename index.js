var Runner = require("./lib/runner");
var _ = require("underscore")._;
var fs = require("fs");
var Executable = require("./lib/executable");
var Queryable = require("./lib/queryable");
var Table = require("./lib/table");
var util = require("util");
var assert = require("assert");
var ArgTypes = require("./lib/arg_types");
var path = require("path");
var DA = require('deasync');
var stripBom = require('strip-bom');

var self;

var Massive = function(args){
  this.scriptsDir = args.scripts || process.cwd() + "/db";

  var runner = new Runner(args.connectionString);
  _.extend(this,runner);

  this.tables = [];
  this.views = [];
  this.queryFiles = [];
  this.schemas = [];
  this.functions = [];

  if(args.whitelist) {
    this.whitelist = this.getTableFilter(args.whitelist);
  } else {
    this.allowedSchemas = this.getSchemaFilter(args.schema);
    this.blacklist = this.getTableFilter(args.blacklist);
    this.exceptions = this.getTableFilter(args.exceptions);
  }
  // any "truthy" value passed will cause functions to be excluded. No param
  // will be a "falsy" value, and functions will be included...
  this.excludeFunctions = args.excludeFunctions;
  this.functionBlacklist = this.getTableFilter(args.functionBlacklist);
};

Massive.prototype.getSchemaFilter = function(allowedSchemas) {
  // an empty string will cause all schema to be loaded by default:
  var result = '';
  if(allowedSchemas === 'all' || allowedSchemas === '*') {
    // Do nothing else. Leave the default empty string:
    allowedSchemas = null;
  }
  if(allowedSchemas) {
    // there is a value of some sort other than our acceptable defaults:
    if(_.isString(allowedSchemas)) {
      // a string works. If comma-delimited, so much the better, we're done:
      result = allowedSchemas;
    } else {
      if(!_.isArray(allowedSchemas)) {
        throw("Specify allowed schemas using either a commma-delimited string or an array of strings");
      }
      // create a comma-delimited string:
      result = allowedSchemas.join(", ");
    }
  }
  return result;
};

Massive.prototype.getTableFilter = function(filter) {
  // an empty string will cause all schema to be loaded by default:
  var result = '';
  if(filter) {
    // there is a value of some sort other than our acceptable defaults:
    if(_.isString(filter)) {
      // a string works. If comma-delimited, so much the better, we're done:
      result = filter;
    } else {
      if(!_.isArray(filter)) {
        throw("Specify filter patterns using either a commma-delimited string or an array of strings");
      }
      // create a comma-delimited string:
      result = filter.join(", ");
    }
  }
  return result;
};

Massive.prototype.run = function(){
  var args = ArgTypes.queryArgs(arguments);
  this.query(args);
};
Massive.prototype.runSync = DA(Massive.prototype.run);

Massive.prototype.loadQueries = function() {
  walkSqlFiles(this, this.scriptsDir);
};

Massive.prototype.loadTables = function(next) {
  var tableSql = __dirname + "/lib/scripts/tables.sql";
  var parameters = [this.allowedSchemas, this.blacklist, this.exceptions];
  var self = this;

  // ONLY allow whitelisted items:
  if(this.whitelist) {
    tableSql = __dirname + "/lib/scripts/whitelist.sql";
    parameters = [this.whitelist];
  }

  this.executeSqlFile({file : tableSql, params: parameters}, function(err,tables) {
    if (err) { return next(err, null); }

    _.each(tables, function(table){
      var _table = new Table({
        schema : table.schema,
        name : table.name,
        pk : table.pk,
        db : self
      });

      MapToNamespace(_table);
    });

    next(null,self);
  });
};

Massive.prototype.loadViews = function(next) {
  var viewSql = __dirname + "/lib/scripts/views.sql";
  var parameters = [this.allowedSchemas, this.blacklist, this.exceptions];
  var self = this;

  this.executeSqlFile({file : viewSql, params: parameters}, function(err, views){
    if (err) { return next(err, null); }

    _.each(views, function(view) {
      var _view = new Queryable({
        schema : view.schema,
        name : view.name,
        db : self
      });

      MapToNamespace(_view, "views");
    });

    next(null, self);
  });
};

Massive.prototype.saveDoc = function(collection, doc, next){
  var self = this;

  // default is public. Table constructor knows what to do if 'public' is used as the schema name:
  var schemaName = "public";
  var tableName = collection;
  var potentialTable = null;

    // is the collection namespace delimited?
  var splits = collection.split(".");
  if(splits.length > 1) {
    // uh oh. Someone specified a schema name:
    schemaName = splits[0];
    tableName = splits[1];
    potentialTable = self[schemaName][tableName];
  } else {
    potentialTable = self[tableName];
  }

  if(potentialTable) {
    potentialTable.saveDoc(doc, next);
  } else {
    var _table = new Table({
    schema : schemaName,
     pk : "id",
     name : tableName,
     db : self
    });

    // Create the table in the back end:
    var sql = this.documentTableSql(collection);

    this.query(sql, function(err){
      if(err){
        next(err,null);
      } else {
        MapToNamespace(_table);
        // recurse
        self.saveDoc(collection,doc,next);
      }
    });
  }
};
Massive.prototype.saveDocSync = DA(Massive.prototype.saveDoc);

var MapToNamespace = function(entity, collection) {
  collection = collection || "tables";

  var db = entity.db;
  var executor;
  var schemaName;

  // executables are always invoked directly, so we need to handle them a bit differently
  if (entity instanceof Executable) {
    executor = function () {
      entity.invoke.apply(entity, arguments);
    };
  }

  if (entity.schema === "public") {
    db[entity.name] = executor || entity;
  } else {
    schemaName = entity.schema;
    // is this schema already attached?
    if(!db[schemaName]) {
      // if not, then bolt it on:
      db[schemaName] = {};
    }
    // attach the entity to the schema:
    db[schemaName][entity.name] = executor || entity;
  }

  db[collection].push(entity);
};

Massive.prototype.documentTableSql = function(tableName){
  var docSqlFile = __dirname + "/lib/scripts/create_document_table.sql";
  var sql = fs.readFileSync(docSqlFile, {encoding: 'utf-8'});

  var indexName = tableName.replace(".", "_");
  sql = util.format(sql, tableName, indexName, tableName, indexName, tableName);
  return sql;
};

//A recursive directory walker that would love to be refactored
var walkSqlFiles = function(rootObject, rootDir) {
  var dirs;
  try {
    dirs = fs.readdirSync(rootDir);
  } catch (ex) {
     return;
  }

  //loop the directories found
  _.each(dirs, function(item){
    //parsing with path is a friendly way to get info about this dir or file
    var ext = path.extname(item);
    var name = path.basename(item, ext);

    //is this a SQL file?
    if (ext === ".sql") {
      //why yes it is! Build the abspath so we can read the file
      var filePath = path.join(rootDir,item);

      //pull in the SQL - don't worry this only happens once, when
      //massive is loaded using connect()
      //remove the unicode Byte Order Mark
      var sql = stripBom(fs.readFileSync(filePath, {encoding : "utf-8"}));

      var _exec = new Executable({
        sql: sql,
        filePath: filePath,
        name : name,
        db : self
      });

      // unfortunately we can't use MapToNamespace here without making a ton of changes
      // since we need to accommodate deeply-nested directories rather than 1-deep schemata
      self.queryFiles.push(_exec);
      rootObject[name] = function () {
        return _exec.invoke.apply(_exec, arguments);
      };
    } else if (ext === '') {
      //this is a directory so shift things and move on down
      //set a property on our root object, then use *that*
      //as the root in the next call
      rootObject[name] = {};

      //set the path to walk so we have a correct root directory
      var pathToWalk = path.join(rootDir,item);

      //recursive call - do it all again
      walkSqlFiles(rootObject[name], pathToWalk);
    }
  });
};

Massive.prototype.loadFunctions = function(next) {
  if (!this.excludeFunctions) {
    var functionSql = __dirname + "/lib/scripts/functions.sql";
    var parameters = [this.functionBlacklist];

    this.executeSqlFile({file : functionSql, params : parameters}, function (err,functions) {
      if (err) {
        next(err, null);
      } else {
        _.each(functions, function(fn) {
          var schema = fn.schema;
          var sql;
          var params = [];

          for (var i = 1; i <= fn.param_count; i++) {
            params.push("$" + i);
          }

          if (schema !== "public") {
            sql = util.format("select * from \"%s\".\"%s\"", schema, fn.name);
            self[schema] = self[schema] || {};
          } else {
            sql = util.format("select * from \"%s\"", fn.name);
          }

          sql += "(" + params.join(",") + ")";

          var _exec = new Executable({
            sql: sql,
            schema: schema,
            name : fn.name,
            db : self
          });

          MapToNamespace(_exec, "functions");
        });

        next(null, self);
      }
    });
  } else {
    next(null, self);
  }
};

//connects Massive to the DB
exports.connect = function(args, next){
  assert((args.connectionString || args.db), "Need a connectionString or db (name of database on localhost) at the very least.");

  //override if there's a db name passed in
  if (args.db) {
    args.connectionString = "postgres://localhost/"+args.db;
  }

  var massive = new Massive(args);

  //load up the tables, queries, and commands
  massive.loadTables(function(err, db) {
    //handle error if loading the functions fails and bubble it up
    if (err) {
      return next(err, null);
    }

    self = db;

    massive.loadViews(function() {
      massive.loadFunctions(function(err, db) {
        assert(!err, err);
        //synchronous
        db.loadQueries();
        next(null,db);
      });
    });
  });
};

exports.loadSync = DA(this.connect);
exports.connectSync = DA(this.connect);
