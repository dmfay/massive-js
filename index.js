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

exports = module.exports = co.wrap(function* (config) {
  this.pgp = require('pg-promise')(config || {});

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

  if (config.db) {
    config.connectionString = "postgres://localhost/" + config.db;
  }

  this.query = (query, params, options = {}) => {
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
      qrm = this.pgp.queryResult.one | this.pgp.queryResult.none;
    } else {
      qrm = this.pgp.queryResult.any;
    }

    let promise;

    if (options.stream) {
      const qs = new QueryStream(sql, params);

      promise = new Promise((resolve, reject) => this.driver.stream(qs, resolve).catch(reject));
    } else {
      promise = this.driver.query(sql, params, qrm);
    }

    if (options.document) {
      promise = promise.then(format);
    }

    return promise;
  };

  const attach = (ctor, ...sources) => {
    const sourcePromises = sources.map(source => source(this.driver, loaderConfig));

    return Promise.all(sourcePromises).then(([result]) => {
      return Promise.resolve(result.map(spec => {
        spec = _.extend(spec, loaderConfig);
        spec.db = {query: this.query};

        const entity = new (Function.prototype.bind.apply(ctor, [null, spec]));
        const path = entity.schema === 'public' ? entity.name : [entity.schema, entity.name].join('.');
        let executor;

        if (ctor === Executable) {
          executor = () => entity.invoke(...arguments);
        }

        _.set(this, path, executor || entity);

        return entity;
      }));
    });
  };

  try {
    this.driver = this.pgp(config.connectionString || config);
    this.run = this.driver.query;

    this.tables = yield attach(Table, require('./lib/loaders/tables'));
    this.views = yield attach(Queryable, require('./lib/loaders/views'));
    this.functions = yield attach(Executable, require('./lib/loaders/functions'));
    this.queryFiles = yield attach(Executable, require('./lib/loaders/scripts'));

    return Promise.resolve(this);
  } catch (e) {
    return Promise.reject(e);
  }
});

exports.detach = function(entity, collection) {
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

