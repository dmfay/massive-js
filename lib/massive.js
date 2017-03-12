'use strict';

const _ = require('lodash');
const co = require('co');
const fs = require('mz/fs');
const path = require('path');
const pgp = require('pg-promise');
const util = require('util');
const QueryStream = require('pg-query-stream');
const filters = require('./util/filters');
const Query = require('./query/query');
const Executable = require('./executable');
const Queryable = require('./queryable');
const Table = require('./table');
const docify = require('./util/docify');
const configFields = ['scripts', 'schema', 'enhancedFunctions', 'excludeFunctions',
  'whitelist', 'blacklist', 'exceptions', 'functionWhitelist', 'functionBlacklist'];

const Massive = function (config, connection) {
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

  this.pgp = pgp(_.omit(config, configFields));
  this.driver = this.pgp(connection);
  this.run = this.driver.query;
  this.loaderConfig = loaderConfig;
};

Massive.prototype.attach = function (ctor, ...sources) {
  const sourcePromises = sources.map(source => {
    if (_.isFunction(source)) {
      return source(this.driver, this.loaderConfig);
    } else {
      return source;
    }
  });

  return Promise.all(sourcePromises).then(result => {
    return Promise.resolve(_.flatten(result).map(spec => {
      spec = _.extend(spec, this.loaderConfig);
      spec.db = this;
      spec.path = !spec.schema || spec.schema === 'public' ? spec.name : [spec.schema, spec.name].join('.');

      const entity = new (Function.prototype.bind.apply(ctor, [null, spec]));
      let executor;

      if (ctor === Executable) {
        executor = function() { return entity.invoke(...arguments); };
      }

      _.set(this, spec.path, executor || entity);

      return entity;
    }));
  });
};

Massive.prototype.detach = function (entity, collection='tables') {
  let schemaName = "public";

  if (entity.indexOf(".") > -1) {
    const tokens = entity.split(".");

    schemaName = tokens[0];
    entity = tokens[1];

    delete this[schemaName][entity];
  } else {
    delete this[entity];
  }

  this[collection] = _.reject(this[collection], function(element) {
    return element.name && element.schema && element.schema === schemaName && element.name === entity;
  });
};

Massive.prototype.reload = co.wrap(function* () {
  if (this.tables) { this.tables.forEach(t => this.detach(t.name, 'tables')); }
  if (this.views) { this.views.forEach(v => this.detach(v.name, 'views')); }
  if (this.functions) { this.functions.forEach(f => this.detach(f.name, 'functions')); }

  this.tables = yield this.attach(Table, require('./loader/tables'));
  this.views = yield this.attach(Queryable, require('./loader/views'));
  this.functions = yield this.attach(Executable, require('./loader/functions'), require('./loader/scripts'));

  return this;
});

Massive.prototype.query = function (query, params = [], options = {}) {
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
    promise = promise.then(docify);
  }

  return promise;
};

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
  const sql = yield fs.readFile(`${__dirname}/scripts/create_document_table.sql`, "UTF-8");
  const splits = path.split(".");
  const tableName = splits.pop();
  const schemaName = splits.length === 1 ? splits.pop() : "public";
  const indexName = tableName.replace(".", "_");

  yield this.query(util.format(sql, path, indexName, path, indexName, path));

  return this.attach(Table, Promise.resolve([{schema: schemaName, pk: 'id', name: tableName}]));
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

Massive.prototype.dropSchema = function(schemaName, options={}) {
  return this.query(`DROP SCHEMA IF EXISTS ${schemaName} ${options.cascade ? "CASCADE" : ""};`)
    .then(() => {
      // Remove all the tables from the namespace
      if(this[schemaName]) {
        _.each(Object.keys(this[schemaName]), table => {
          // TODO functions on schema
          this.detach(schemaName + "." + table);
        });
      }

      // Remove the schema from the namespace
      delete this[schemaName];
    });
};

exports = module.exports = Massive;
