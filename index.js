const Runner = require("./lib/runner");
const _ = require("underscore")._;
const co = require("co");
const fs = require("fs");
const Executable = require("./lib/executable");
const Queryable = require("./lib/queryable");
const Table = require("./lib/table");
const util = require("util");
const ArgTypes = require("./lib/arg_types");
const path = require("path");

if (typeof Promise == 'undefined') {
  global.Promise = require('promise-polyfill');
}

var Massive = function(args) {
  this.scriptsDir = args.scripts || path.join(process.cwd(), "db");
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

Massive.prototype.attach = function (entity, collection) {
  var executor;
  entity.db = this;

  // executables are always invoked directly, so we need to handle them a bit differently
  if (entity instanceof Executable) {
    executor = function () {
      entity.invoke.apply(entity, arguments);
    };
  }

  if (entity.schema !== "public") {
    if (!this.hasOwnProperty(entity.schema)) {
      this[entity.schema] = {};
    }

    this[entity.schema][entity.name] = executor || entity;
  } else {
    this[entity.name] = executor || entity;
  }

  this[collection].push(entity);
};

Massive.prototype.loadTables = co.wrap(function* () {
  let tableSql = __dirname + "/lib/scripts/tables.sql";
  let parameters = [this.allowedSchemas, this.blacklist, this.exceptions];

  // ONLY allow whitelisted items:
  if(this.whitelist) {
    tableSql = __dirname + "/lib/scripts/whitelist.sql";
    parameters = [this.whitelist];
  }

  const tables = yield this.executeSqlFile({file: tableSql, params: parameters});

  tables.forEach(t => this.attach(new Table(t), "tables"));
});

Massive.prototype.loadDescendantTables = co.wrap(function* () {
  const tableSql = __dirname + "/lib/scripts/descendant_tables.sql";
  const parameters = [this.allowedSchemas, this.blacklist, this.exceptions];

  const tables = yield this.executeSqlFile({file: tableSql, params: parameters});

  tables.forEach(t => {
    if (this.hasOwnProperty(t.parent)) {
      t.pk = this[t.parent].pk;

      this.attach(new Table(t), "tables");
    }
  });
});

Massive.prototype.loadViews = co.wrap(function* () {
  const viewSql = __dirname + "/lib/scripts/views.sql";
  const parameters = [this.allowedSchemas, this.blacklist, this.exceptions];
  const views = yield this.executeSqlFile({file: viewSql, params: parameters});

  views.forEach(v => this.attach(new Queryable(v), "views"));
});

Massive.prototype.saveDoc = function(collection, doc, next){
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
    potentialTable = this[schemaName][tableName];
  } else {
    potentialTable = this[tableName];
  }

  if(potentialTable) {
    potentialTable.saveDoc(doc, next);
  } else {
    var _table = new Table({
    schema : schemaName,
     pk : "id",
     name : tableName,
     db : this
    });

    // Create the table in the back end:
    var sql = this.documentTableSql(collection);

    this.query(sql, err =>{
      if(err){
        next(err,null);
      } else {
        MapToNamespace(_table);
        // recurse
        this.saveDoc(collection,doc,next);
      }
    });
  }
};

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
};

Massive.prototype.createDocumentTable = function(path, next) {
  // Create the table in the back end:
  var splits = path.split(".");
  var tableName;
  var schemaName;
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
   db : this
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
  this.query(sql, (err, res) => {
    if(err) {
      next(err, null);
    } else {
      RemoveFromNamespace(this, table);
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
  this.query(sql, (err, res) => {
    if(err) {
      next(err);
    } else {
      this[schemaName] = {};
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

  this.query(sql, (err, res) => {
    if(err) {
      next(err);
    } else {
      // Remove all the tables from the namespace
      if(this[schemaName]) {
        _.each(Object.keys(this[schemaName]), function(table) {
          RemoveFromNamespace(this, schemaName + "." + table);
        });
      }
      // Remove the schema from the namespace
      delete this[schemaName];
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

Massive.prototype.loadScripts = function (collection, dir) {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, files) => {
      if (err) { return reject(err); }

      Promise.all(files.map(f => new Promise((resolve, reject) => {
        let filePath = path.join(dir, f);

        fs.stat(filePath, (err, s) => {
          if (err) {
            return reject(err);
          } else if (s.isDirectory() && !collection.hasOwnProperty(f)) {
            collection[f] = {};
            this.loadScripts(collection[f], filePath).then(resolve);
          } else if (s.isFile() && path.extname(f) === ".sql") {
            fs.readFile(filePath, {encoding: "utf-8"}, (err, sql) => {
              if (err) { return reject(err); }

              let name = path.basename(f, ".sql");
              let exec = new Executable({
                sql: sql,
                filePath: filePath,
                name: name,
                db: this
              });

              this.queryFiles.push(exec);
              collection[name] = function () {
                return exec.invoke.apply(exec, arguments);
              };

              return resolve();
            });
          }
        });
      }))).then(resolve);
    });
  });
};

Massive.prototype.loadFunctions = co.wrap(function* () {
  if (this.excludeFunctions) { return; }

  const functionSql = __dirname + "/lib/scripts/functions.sql";
  const parameters = [this.functionBlacklist, this.functionWhitelist];

  const functions = yield this.executeSqlFile({file: functionSql, params: parameters});

  functions.forEach(fn => {
    const name = fn.schema === "public" ? `"${fn.name}"` : `"${fn.schema}"."${fn.name}"`;
    const params = _.range(1, fn.param_count + 1).map(i => `$${i}`);

    if (fn.schema !== "public" && !this.hasOwnProperty(fn.schema)) {
      this[fn.schema] = {};
    }

    this.attach(new Executable({
      sql: `select * from ${name}(${params.join(",")})`,
      schema: fn.schema,
      name : fn.name,
      singleRow: this.enhancedFunctions && fn.return_single_row,
      singleValue: this.enhancedFunctions && fn.return_single_value
    }), "functions");
  });
});

//connects Massive to the DB
exports.connect = co.wrap(function* (args) {
  if (args.db) {
    args.connectionString = "postgres://localhost/" + args.db;
  } else if (!args.connectionString) {
    throw new Error("Need a connectionString or db (name of database on localhost) to connect.");
  }

  var massive = new Massive(args);

  yield massive.loadTables();
  yield massive.loadDescendantTables();
  yield massive.loadViews();
  yield massive.loadFunctions();
  yield massive.loadScripts(massive, massive.scriptsDir);

  return Promise.resolve(massive);
});
