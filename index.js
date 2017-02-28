var Runner = require("./lib/runner");
var _ = require("underscore")._;
var fs = require("fs");
var Executable = require("./lib/executable");
var Queryable = require("./lib/queryable");
var Table = require("./lib/table");
var util = require("util");
var ArgTypes = require("./lib/arg_types");
var path = require("path");
var DA = require('deasync');
var stripBom = require('strip-bom');
var async = require('async');

if (typeof Promise == 'undefined') {
  global.Promise = require('promise-polyfill');
}

var Massive = function(args) {
  this._options = args;
  if (typeof args.warn === 'function') {
    this.warn = args.warn;
  }
  this.scriptsDir = args.scripts || process.cwd() + "/db";
  this.enhancedFunctions = args.enhancedFunctions || false;

  var runner = new Runner(args.connectionString, args.defaults);
  _.extend(this, runner);

  this.tables = [];
  this.views = [];
  this.queryFiles = [];
  this.schemas = [];
  this.functions = [];

  if (args.whitelist) {
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
  this.functionWhitelist = this.getTableFilter(args.functionWhitelist);
};

Massive.prototype.withConnectionWrapper = function(wrapper) {
  if (typeof wrapper !== 'function') {
    throw new Error("withConnectionWrapper expected a function");
  }
  if (wrapper.length !== 3) {
    throw new Error("withConnectionWrapper expected a function accepting 3 arguments");
  }
  var oldWrapper = this.connectionWrapper;
  var newDb = new Massive(this._options);
  newDb.connectionWrapper = function (fn) {
    var oldHandler = oldWrapper.call(this, fn);
    return function(err, pgClient, done) {
      if (err) return oldHandler(err, pgClient, done);
      wrapper(pgClient, oldHandler, done);
    };
  };
  newDb.initialize(this._resources);
  return newDb;
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

Massive.prototype.fetchQueries = function(next) {
  walkSqlFiles(this, this.scriptsDir, next);
};

Massive.prototype.initialize = function(resources) {
  var self = this;
  self._resources = resources;

  _.each(resources.tables, function(table){
    var _table = new Table({
      schema : table.schema,
      name : table.name,
      pk : table.pk,
      db : self
    });

    MapToNamespace(_table);
  });
  _.each(resources.descendantTables, function (table) {
    // if parent table is already defined it means it has been whitelisted / validated
    // so we safely can add the descendant to the available tables
    if (undefined !== typeof self[table.parent]) {
      var _table = new Table({
        schema : table.schema,
        name : table.child,
        pk : self[table.parent].pk,
        db : self
      });

      MapToNamespace(_table);
    }
  });
  _.each(resources.views, function(view) {
    var _view = new Queryable({
      schema : view.schema,
      name : view.name,
      db : self
    });

    MapToNamespace(_view, "views");
  });
  _.each(resources.functions, function(fn) {
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
      db : self,
      singleRow: self.enhancedFunctions && fn.return_single_row,
      singleValue: self.enhancedFunctions && fn.return_single_value
    });

    MapToNamespace(_exec, "functions");
  });

  // queries is a nested structure that takes the form:
  // {self: [{sql, filePath, name}, {...}, ...], children: {name: {self: [{...}, {...}, ...
  function addQueries(rootObject, queryPath, queries) {
    queries.self.forEach(function(spec) {
      // spec takes the form: {sql, filePath, name}
      var name = spec.name;

      // unfortunately we can't use MapToNamespace here without making a ton of changes
      // since we need to accommodate deeply-nested directories rather than 1-deep schemata
      if (rootObject[name]) {
        self.warn("Refusing to overwrite property '" + queryPath + name + "' (" + queries.path + ")");
      } else {
        var _exec = new Executable(_.extend({}, spec, {
          db : self
        }));
        self.queryFiles.push(_exec);
        rootObject[name] = function () {
          return _exec.invoke.apply(_exec, arguments);
        };
      }
    });
    for (var name in queries.children) {
      if (!rootObject[name]) {
        rootObject[name] = {};
      }
      addQueries(rootObject[name], queryPath + name + '/', queries.children[name]);
    }
  }
  addQueries(self, '', resources.queries);
};

Massive.prototype.fetchTables = function(next) {
  var tableSql = __dirname + "/lib/scripts/tables.sql";
  var parameters = [this.allowedSchemas, this.blacklist, this.exceptions];

  // ONLY allow whitelisted items:
  if(this.whitelist) {
    tableSql = __dirname + "/lib/scripts/whitelist.sql";
    parameters = [this.whitelist];
  }

  this.executeSqlFile({file : tableSql, params: parameters}, next);
};

Massive.prototype.fetchDescendantTables = function(next) {
  var tableSql = __dirname + "/lib/scripts/descendant_tables.sql";
  var parameters = [this.allowedSchemas, this.blacklist, this.exceptions];

  this.executeSqlFile({file : tableSql, params: parameters}, next);
};

Massive.prototype.fetchViews = function(next) {
  var viewSql = __dirname + "/lib/scripts/views.sql";
  var parameters = [this.allowedSchemas, this.blacklist, this.exceptions];

  this.executeSqlFile({file : viewSql, params: parameters}, next);
};

Massive.prototype.saveDoc = function(collection, doc, next){
  // default is public. Table constructor knows what to do if 'public' is used as the schema name:
  var schemaName = "public";
  var tableName = collection;
  var potentialTable = null;
  var self = this;

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
      return entity.invoke.apply(entity, arguments);
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

var RemoveFromNamespace = function(db, table) {
  // right now only tables are supported
  var collection = "tables";

  var splits = table.split('.');
  var tableName, schemaName;

  if(splits.length > 1) {
    schemaName = splits[0];
    tableName = splits[1];
  } else {
    schemaName = "public";
    tableName = table;
  }

  if(schemaName === "public" && db[table]) {
    delete db[table];
  }else if(db[schemaName] && db[schemaName][tableName]) {
    delete db[schemaName][tableName];
  }

  if(db[collection]) {
    db[collection] = _.reject(db[collection], function(element) {
      return element.name && element.schema && element.schema === schemaName && element.name === tableName;
    });
  }

  var tableIndex = -1;
  db._resources.tables.forEach(function(spec, index) {
    if (spec.schema === schemaName && spec.name === tableName) {
      tableIndex = index;
    }
  });
  if (tableIndex >= 0) {
    db._resources.tables.splice(tableIndex, 1);
  }
};


Massive.prototype.createDocumentTable = function(path, next) {
  // Create the table in the back end:
  var splits = path.split(".");
  var tableName;
  var schemaName;
  var self = this;
  if(splits.length > 1) {
    // uh oh. Someone specified a schema name:
    schemaName = splits[0];
    tableName = splits[1];
  } else {
    schemaName = "public"; // default schema
    tableName = path;
  }

  var _table = new Table({
  schema : schemaName,
   pk : "id",
   name : tableName,
   db : self
  });

  var sql = this.documentTableSql(path);

  this.query(sql, function(err, res){
    if(err){
      next(err,null);
    } else {
      MapToNamespace(_table);
      next(null, res);
    }
  });
};

Massive.prototype.documentTableSql = function(tableName){
  var docSqlFile = __dirname + "/lib/scripts/create_document_table.sql";
  var sql = fs.readFileSync(docSqlFile, {encoding: 'utf-8'});

  var indexName = tableName.replace(".", "_");
  sql = util.format(sql, tableName, indexName, tableName, indexName, tableName);
  return sql;
};


Massive.prototype.dropTable = function(table, options, next) {
  var sql = this.dropTableSql(table, options);
  var self = this;
  this.query(sql, function(err, res) {
    if(err) {
      next(err, null);
    } else {
      RemoveFromNamespace(self, table);
      next(null, res);
    }
  });
};

Massive.prototype.dropTableSql = function(tableName, options){
  var docSqlFile = __dirname + "/lib/scripts/drop_table.sql";
  var sql = fs.readFileSync(docSqlFile, {encoding: 'utf-8'});
  var cascadeOpt = options && options.cascade === true ? "CASCADE" : "";
  sql = util.format(sql, tableName, cascadeOpt);
  return sql;
};

Massive.prototype.createSchema = function(schemaName, next) {
  var sql = this.createSchemaSql(schemaName);
  var self = this;
  this.query(sql, function(err, res) {
    if(err) {
      next(err);
    } else {
      self[schemaName] = {};
      next(null, res);
    }
  });
};

Massive.prototype.createSchemaSql = function(schemaName) {
  var docSqlFile = __dirname + "/lib/scripts/create_schema.sql";
  var sql = fs.readFileSync(docSqlFile, {encoding: 'utf-8'});

  sql = util.format(sql, schemaName);
  return sql;
};

Massive.prototype.dropSchema = function(schemaName, options, next) {
  var sql = this.dropSchemaSql(schemaName, options);
  var self = this;

  this.query(sql, function(err, res) {
    if(err) {
      next(err);
    } else {
      // Remove all the tables from the namespace
      if(self[schemaName]) {
        _.each(Object.keys(self[schemaName]), function(table) {
          RemoveFromNamespace(self, schemaName + "." + table);
        });
      }
      // Remove the schema from the namespace
      delete self[schemaName];
      next(null, res);
    }
  });
};

Massive.prototype.dropSchemaSql = function(schemaName, options) {
  var docSqlFile = __dirname + "/lib/scripts/drop_schema.sql";
  var sql = fs.readFileSync(docSqlFile, {encoding: 'utf-8'});
  // Default to restrict, but optional cascade
  var cascadeOpt = options && options.cascade === true ? "CASCADE" : "";
  sql = util.format(sql, schemaName, cascadeOpt);
  return sql;
};

//A recursive directory walker that would love to be refactored
var walkSqlFiles = function(self, rootDir, next) {
  var results = {
    path: rootDir,
    self: [],
    children: {}
  };
  function processFile(file, next) {
    var filePath = path.join(rootDir, file);
    fs.stat(filePath, function(err, stats) {
      if (err) return next();
      var ext = path.extname(file);
      var name = path.basename(file, ext);

      if (stats.isFile() && ext === ".sql") {
        //why yes it is! pull in the SQL
        //remove the unicode Byte Order Mark
        var sql = stripBom(fs.readFileSync(filePath, {encoding : "utf-8"}));
        results.self.push({
          sql: sql,
          filePath: filePath,
          name : name
        });
        next();
      } else if (stats.isDirectory()) {
        walkSqlFiles(self, filePath, function(err, childResults) {
          if (err) return next(err);
          results.children[name] = childResults;
          next();
        });
      } else {
        next();
      }
    });
  }
  fs.readdir(rootDir, function(err, files) {
    // Swallow errors from non-existent directories
    if (err) return next(null, results);

    // Ensure clashes are deterministic; if 'foo' and 'foo.sql' both exist then
    // 'foo.sql' should win
    files.sort().reverse();

    // Executing in series so we don't end up with too many in parallel; plus
    // we want clashes to be deterministic.
    async.eachSeries(files, processFile, function(err) {
      next(err, results);
    });
  });
};

Massive.prototype.fetchFunctions = function(next) {
  if (!this.excludeFunctions) {
    var functionSql = __dirname + "/lib/scripts/functions.sql";
    var parameters = [this.functionBlacklist, this.functionWhitelist];

    this.executeSqlFile({file : functionSql, params : parameters}, next);
  } else {
    next(null, {});
  }
};

Massive.prototype.bootstrap = function(next) {

  var self = this;
  //load up the tables, queries, and commands
  self.fetchTables(function(err, tables) {
    if (err) { return next(err); }

    self.fetchDescendantTables(function (err, descendantTables) {
      if (err) { return next(err); }

      self.fetchViews(function(err, views) {
        if (err) { return next(err); }

        self.fetchFunctions(function(err, functions) {
          if (err) { return next(err); }

          self.fetchQueries(function(err, queries) {
            if (err) { return next(err); }

            self.initialize({
              tables: tables,
              descendantTables: descendantTables,
              views: views,
              functions: functions,
              queries: queries
            });

            next(null, self);
          });
        });
      });
    });
  });
};

// Can be over-ridden via `warn` connection setting
Massive.prototype.warn = function (message) {
  console.warn("[Massive] WARNING: " + message); // eslint-disable-line no-console
};

//connects Massive to the DB
exports.connect = function(args, next) {
  //override if there's a db name passed in
  if (args.db) {
    args.connectionString = "postgres://localhost/"+args.db;
  } else if (!args.connectionString) {
    return next(new Error("Need a connectionString or db (name of database on localhost) to connect."));
  }

  var massive = new Massive(args);

  massive.bootstrap(next);
};

exports.loadSync = DA(this.connect);
exports.connectSync = DA(this.connect);
