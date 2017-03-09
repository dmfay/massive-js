'use strict';

const _ = require('lodash');
const co = require('co');
const fs = require('mz/fs');
const QueryStream = require('pg-query-stream');
const filters = require('./lib/filters');
const Executable = require('./lib/executable');
const Queryable = require('./lib/queryable');
const Table = require('./lib/table');
const Query = require('./lib/query/query');
const format = require('./lib/formatters');
const util = require('util');
const path = require('path');
const configFields = ['pgFormatting', 'pgNative', 'promiseLib', 'noLocking', 'capSQL', 'noWarnings', 'connect', 'disconnect', 'query', 'receive', 'task', 'transact', 'error', 'extend'];
const connectionFields = ['connectionString', 'db', 'database', 'host', 'port', 'user', 'password', 'ssl', 'binary', 'client_encoding', 'application_name', 'fallback_application_name', 'poolSize'];

exports = module.exports = config => {
  const db = Object.create(null);

  let connection = _.pick(config, connectionFields);

  if (Object.keys(connection).length === 1 && (!!connection.database || !!connection.db)) {
    connection = `postgres://localhost:5432/${connection.database || connection.db}`;
  }

  db.pgp = require('pg-promise')(_.pick(config, configFields));

  const loaderConfig = {
    enhancedFunctions: config.enhancedFunctions || false,
    excludeFunctions: config.excludeFunctions,
    functionBlacklist: filters.entity(config.functionBlacklist),
    functionWhitelist: filters.entity(config.functionWhitelist),
    scriptsDir: config.scripts || path.join(process.cwd(), 'db')
  };

  if (config.whitelist) {
    loaderConfig.whitelist = filters.entity(config.whitelist);
  } else {
    loaderConfig.allowedSchemas = filters.schema(config.schema);
    loaderConfig.blacklist = filters.entity(config.blacklist);
    loaderConfig.exceptions = filters.entity(config.exceptions);
  }

  db.query = (query, params, options = {}) => {
    let sql;

    if (query instanceof Query) {
      sql = query.format();
      params = query.where.params;
      options = query;
    } else {
      sql = query;
    }

    let qrm;

    if (options.single) {
      qrm = db.pgp.queryResult.one | db.pgp.queryResult.none;
    } else {
      qrm = db.pgp.queryResult.any;
    }

    let promise;

    if (options.stream) {
      const qs = new QueryStream(sql, params);

      promise = new Promise((resolve, reject) => db.driver.stream(qs, resolve).catch(reject));
    } else {
      promise = db.driver.query(sql, params, qrm);
    }

    if (options.document) {
      promise = promise.then(format);
    }

    return promise;
  };

  const attach = (ctor, ...sources) => {
    const sourcePromises = sources.map(source => source(db.driver, loaderConfig));

    return Promise.all(sourcePromises).then(([result]) => {
      return Promise.resolve(result.map(spec => {
        spec = _.extend(spec, loaderConfig);
        spec.db = {query: db.query};
        spec.path = spec.schema === 'public' ? spec.name : [spec.schema, spec.name].join('.');

        const entity = new (Function.prototype.bind.apply(ctor, [null, spec]));
        let executor;

        if (ctor === Executable) {
          executor = function() { return entity.invoke(...arguments); };
        }

        _.set(db, spec.path, executor || entity);

        return entity;
      }));
    });
  };

  const detach = function(entity, collection) {
    let schemaName = "public";

    if (entity.indexOf(".") > -1) {
      const tokens = entity.split(".");

      schemaName = tokens[0];
      entity = tokens[1];

      delete db[schemaName][entity];
    } else {
      delete db[entity];
    }

    db[collection || "tables"] = _.reject(db[collection || "tables"], function(element) {
      return element.name && element.schema && element.schema === schemaName && element.name === entity;
    });
  };

  db.reload = co.wrap(function* () {
    if (db.tables) { db.tables.forEach(t => detach(t.name, 'tables')); }
    if (db.views) { db.views.forEach(v => detach(v.name, 'views')); }
    if (db.functions) { db.functions.forEach(f => detach(f.name, 'functions')); }
    if (db.queryFiles) { db.queryFiles.forEach(q => detach(q.name, 'queryFiles')); }

    db.tables = yield attach(Table, require('./lib/loaders/tables'));
    db.views = yield attach(Queryable, require('./lib/loaders/views'));
    db.functions = yield attach(Executable, require('./lib/loaders/functions'));
    db.queryFiles = yield attach(Executable, require('./lib/loaders/scripts'));

    return db;
  });

  try {
    db.driver = db.pgp(connection);
    db.run = db.driver.query;

    return db.reload();
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.saveDoc = co.wrap(function* (collection, doc) {
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

exports.createDocumentTable = co.wrap(function* (path) {
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

exports.dropTable = function (table, options) {
  const cascade = options && options.cascade;

  return this.query(`DROP TABLE IF EXISTS ${table} ${cascade ? "CASCADE" : ""};`)
    .then(() => {
      this.detach(table);
    });
};

exports.createSchema = function (schemaName) {
  return this.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`)
    .then(() => {
      this[schemaName] = {};
    });
};

exports.dropSchema = function(schemaName, options) {
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

