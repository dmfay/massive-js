'use strict';
const Runner = require("./lib/runner");
const _ = require("underscore")._;
const co = require("co");
const fs = require("mz/fs");
const filters = require("./lib/filters");
const Executable = require("./lib/executable");
const Queryable = require("./lib/queryable");
const Table = require("./lib/table");
const util = require("util");
const path = require("path");

const Massive = function(args) {
  this.scriptsDir = args.scripts || path.join(process.cwd(), "db");
  this.enhancedFunctions = args.enhancedFunctions || false;

  _.extend(this, new Runner(args));

  this.run = this.query;

  this.tables = [];
  this.views = [];
  this.queryFiles = [];
  this.schemas = [];
  this.functions = [];

  if (args.whitelist) {
    this.whitelist = filters.entity(args.whitelist);
  } else {
    this.allowedSchemas = filters.schema(args.schema);
    this.blacklist = filters.entity(args.blacklist);
    this.exceptions = filters.entity(args.exceptions);
  }

  // any "truthy" value passed will cause functions to be excluded. No param
  // will be a "falsy" value, and functions will be included...
  this.excludeFunctions = args.excludeFunctions;
  this.functionBlacklist = filters.entity(args.functionBlacklist);
  this.functionWhitelist = filters.entity(args.functionWhitelist);
};

Massive.prototype.attach = function (entity, collection) {
  let executor;
  entity.db = this;

  // executables are always invoked directly, so we need to handle them a bit differently
  if (entity instanceof Executable) {
    executor = function () {
      return entity.invoke.apply(entity, arguments);
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

  this[collection || "tables"].push(entity);
};

Massive.prototype.detach = function(entity, collection) {
  let schemaName = "public";

  if (entity.indexOf(".") > -1) {
    const tokens = entity.split(".");

    schemaName = tokens[0];
    entity = tokens[1];

    delete this[schemaName][entity];
  } else {
    delete this[entity];
  }

  this[collection || "tables"] = _.reject(this[collection || "tables"], function(element) {
    return element.name && element.schema && element.schema === schemaName && element.name === entity;
  });
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

Massive.prototype.loadScripts = co.wrap(function* (collection, dir) {
  const files = yield fs.readdir(dir);

  return Promise.all(files.map(co.wrap(function* (f) {
    const filePath = path.join(dir, f);
    const s = yield fs.stat(path.join(dir, f));

    if (s.isDirectory() && !collection.hasOwnProperty(f)) {
      collection[f] = {};

      return this.loadScripts(collection[f], filePath);
    } else if (s.isFile() && path.extname(f) === ".sql") {
      const sql = yield fs.readFile(filePath, {encoding: "utf-8"});
      const name = path.basename(f, ".sql");
      const exec = new Executable({
        sql: sql,
        filePath: filePath,
        name: name,
        db: this
      });

      this.queryFiles.push(exec);
      collection[name] = function () {
        return exec.invoke.apply(exec, arguments);
      };
    }
  }).bind(this)));  // bind Massive's scope to the loader promises since they can recurse
});

Massive.prototype.loadFunctions = co.wrap(function* () {
  if (this.excludeFunctions) { return; }

  const functionSql = __dirname + "/lib/scripts/functions.sql";
  const parameters = [this.functionBlacklist, this.functionWhitelist];

  const functions = yield this.executeSqlFile({file: functionSql, params: parameters});

  return Promise.all(functions.map(fn => {
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

    return Promise.resolve();
  }));
});

Massive.prototype.saveDoc = co.wrap(function* (collection, doc) {
  let schemaName = "public";
  let tableName = collection;
  let potentialTable = null;

  // is the collection namespace delimited?
  const splits = collection.split(".");
  if (splits.length > 1) {
    schemaName = splits[0];
    tableName = splits[1];
    potentialTable = this[schemaName][tableName];
  } else {
    potentialTable = this[tableName];
  }

  if (potentialTable) {
    return yield potentialTable.saveDoc(doc);
  } else {
    yield this.createDocumentTable(collection);

    return yield this.saveDoc(collection, doc);
  }
});

Massive.prototype.createDocumentTable = co.wrap(function* (path) {
  const sql = yield fs.readFile(`${__dirname}/lib/scripts/create_document_table.sql`, "UTF-8");
  const splits = path.split(".");
  const tableName = splits.pop();
  const schemaName = splits.length === 1 ? splits.pop() : "public";
  const indexName = tableName.replace(".", "_");

  return this.query(util.format(sql, path, indexName, path, indexName, path))
    .then(() => {
      this.attach(new Table({
        schema: schemaName,
        pk: "id",
        name: tableName
      }));
    });
});

Massive.prototype.dropTable = function (table, options) {
  const cascade = options && options.cascade;

  return this.query(`DROP TABLE IF EXISTS ${table} ${cascade ? "CASCADE" : ""};`)
    .then(() => {
      this.detach(table);
    });
};

Massive.prototype.createSchema = function (schemaName) {
  return this.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`)
    .then(() => {
      this[schemaName] = {};
    });
};

Massive.prototype.dropSchema = function(schemaName, options) {
  const cascade = options && options.cascade;

  return this.query(`DROP SCHEMA IF EXISTS ${schemaName} ${cascade ? "CASCADE" : ""};`)
    .then(() => {
      // Remove all the tables from the namespace
      if(this[schemaName]) {
        _.each(Object.keys(this[schemaName]), table => {
          this.detach(schemaName + "." + table);
        });
      }

      // Remove the schema from the namespace
      delete this[schemaName];
    });
};

exports.connect = co.wrap(function* (args) {
  if (args.db) {
    args.connectionString = "postgres://localhost/" + args.db;
  }

  try {
    const massive = new Massive(args);

    yield massive.loadTables();
    yield massive.loadDescendantTables();
    yield massive.loadViews();
    yield massive.loadFunctions();
    yield massive.loadScripts(massive, massive.scriptsDir);

    return Promise.resolve(massive);
  } catch (e) {
    return Promise.reject(e);
  }
});
