'use strict';

const _ = require('lodash');
const pgp = require('pg-promise');
const QueryStream = require('pg-query-stream');
const Query = require('./query/query');
const Executable = require('./executable');
const Queryable = require('./queryable');
const Table = require('./table');
const docify = require('./util/docify');
const queryFile = require('./util/query-file');

/**
 * A database connection.
 *
 * @class
 * @param {Object|String} connection - A pg connection object or a connection
 * string.
 * @param {Object} [loaderConfig] - Filter definition for including and
 * excluding database objects. If nothing is specified, Massive loads every
 * table, view, and function visible to the connection's user.
 * @param {String} loaderConfig.scripts - Override the Massive script file location (default ./db).
 * @param {Array|String} loaderConfig.allowedSchemas - Table/view schema whitelist.
 * @param {Array|String} loaderConfig.whitelist - Table/view name whitelist.
 * @param {Array|String} loaderConfig.blacklist - Table/view name blacklist.
 * @param {Array|String} loaderConfig.exceptions - Table/view blacklist exceptions.
 * @param {Array|String} loaderConfig.functionWhitelist - Function name whitelist.
 * @param {Array|String} loaderConfig.functionBlacklist - Function name blacklist.
 * @param {Boolean} loaderConfig.excludeFunctions - Ignore functions entirely.
 * @param {Boolean} loaderConfig.enhancedFunctions - Streamline function return values.
 * @param {Object} [driverConfig] - A pg-promise configuration object.
 */
const Massive = function (connection, loaderConfig = {}, driverConfig = {}) {
  this.loaderConfig = loaderConfig;
  this.driverConfig = driverConfig;
  this.pgp = pgp(driverConfig);
  this.instance = this.pgp(connection);
  this.run = this.instance.query;
};

/**
 * Discover objects in the database and attach them for usage.
 *
 * Tables and Views are attached to the Database directly, while an invocation
 * function is attached for Executables.
 *
 * References to attached objects are also stored in the tables, views, and
 * functions arrays.
 *
 * @param {Function} ctor - Constructor for the object instances.
 * @param {Promise|Function} - Something which resolves to a list of entity
 * specifications.
 * @return {Promise} The collection of objects just attached.
 */
Massive.prototype.attach = function (ctor, ...sources) {
  const sourcePromises = sources.map(source => {
    if (_.isFunction(source)) {
      return source(this.instance, this.loaderConfig);
    } else {
      return source;
    }
  });

  return this.instance.$config.promise.all(sourcePromises).then(result => {
    return _.flatten(result).map(spec => {
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
    });
  });
};

/**
 * Forget an entity.
 *
 * @param {String} entity - Fully-qualified name of the entity.
 * @param {String} [collection] - Name of the collection to which the entity
 * belongs.
 */
Massive.prototype.detach = function (entity, collection='tables') {
  // TODO should be able to determine collection from entity type
  let schema = "public";

  if (entity.indexOf(".") > -1) {
    const tokens = entity.split(".");

    schema = tokens[0];
    entity = tokens[1];

    delete this[schema][entity];
  } else {
    delete this[entity];
  }

  this[collection] = _.reject(this[collection], function (element) {
    return element.name === entity && element.schema === schema;
  });
};

/**
 * Introspect the connected database and attach all available objects.
 *
 * @function
 */
Massive.prototype.reload = function () {
  if (this.tables) { this.tables.forEach(t => this.detach(t.name, 'tables')); }
  if (this.views) { this.views.forEach(v => this.detach(v.name, 'views')); }
  if (this.functions) { this.functions.forEach(f => this.detach(f.name, 'functions')); }

  return this.instance.$config.promise.all([
    this.attach(Table, require('./loader/tables')).then(tables => this.tables = tables),
    this.attach(Queryable, require('./loader/views')).then(views => this.views = views),
    this.attach(Executable, require('./loader/functions'), require('./loader/scripts')).then(functions => this.functions = functions)
  ]).then(() => this);
};

/**
 * Execute a query.
 *
 * @param {Query|String} - A Query object or a raw SQL statement.
 * @param {Array} [params] - An array of the prepared statement parameters, if
 * applicable.
 * @param {Object} options - If using raw SQL, a subset of query options may be
 * applied.
 * @param {Boolean} options.document - This is a query against a document
 * table.
 * @param {Boolean} options.single - True to return a single result object
 * instead of an array of results.
 * @param {Boolean} options.stream - True to return a stream instead of a
 * resultset.
 * @return {Promise} Query results.
 */
Massive.prototype.query = function (query, params = [], options = {}) {
  let sql;

  if (query instanceof Query) {
    sql = query.format();
    params = query.where.params;
    options = query;
  } else {
    sql = query;
  }

  if (options.build) {
    return this.instance.$config.promise.resolve({
      sql: sql,
      params: params
    });
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

    promise = this.instance.$config.promise((resolve, reject) => this.instance.stream(qs, resolve).catch(reject));
  } else {
    promise = this.instance.query(sql, params, qrm);
  }

  if (options.document) {
    promise = promise.then(docify);
  }

  return promise;
};

/**
 * Save a document.
 *
 * @function
 * @param {String} collection - Document table name to save to. If it does not
 * already exist, it will be created.
 * @param {Object} doc - A JSON document.
 */
Massive.prototype.saveDoc = function (collection, doc) {
  let potentialTable = this.getObject(collection);

  if (potentialTable) {
    return potentialTable.saveDoc(doc);
  } else {
    return this.createDocumentTable(collection).then(() => this.saveDoc(collection, doc));
  }
};

/**
 * Create a new document table and attach it to the Database for usage.
 *
 * @function
 * @param {String} path - Name of the table to create. Unless the schema is
 * specified in a qualified path, 'public' is assumed.
 * @return {Promise} The added table.
 */
Massive.prototype.createDocumentTable = function (path) {
  const sql = queryFile('document-table.sql');
  const splits = path.split('.');
  const tableName = splits.pop();
  const schemaName = splits.pop() || 'public';
  const indexName = tableName.replace('.', '_');

  return this.query(sql, {
    schema: schemaName,
    table: tableName,
    index: indexName
  }).then(() =>
    this.attach(Table, this.instance.$config.promise.resolve([{schema: schemaName, pk: 'id', name: tableName}]))
  ).then(added => {
    this.tables.push(added[0]);

    return added[0];
  });
};

/**
 * Find a database object, if attached.
 *
 * @function
 * @param {String} path - Name of the object to find. Unless the schema is
 * specified in a qualified path, 'public' is assumed.
 * @param {String} [collection=tables] - Collection to search: tables, views, or
 * functions.
 * @return {Object} The table, if found.
 */
Massive.prototype.getObject = function (path, collection = 'tables') {
  const splits = path.split(".");
  const name = splits.pop();
  const schema = splits.pop() || "public";

  return this[collection].find(obj => (obj.schema == schema && obj.name == name));
};

/**
 * Drop a table and remove it from the Database.
 *
 * @param {String} table - Name of the table to drop.
 * @param {Object} options - Additional options.
 * @param {Boolean} options.cascade - True to drop any objects that depend on
 * the table.
 */
Massive.prototype.dropTable = function (table, options) {
  const cascade = options && options.cascade;

  return this.query(`DROP TABLE IF EXISTS ${table} ${cascade ? "CASCADE" : ""};`)
    .then(() => {
      this.detach(table);
    });
};

/**
 * Create a new schema in the database.
 *
 * @param {String} schemaName - A valid schema name.
 */
Massive.prototype.createSchema = function (schemaName) {
  return this.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`)
    .then(() => {
      this[schemaName] = {};
    });
};

/**
 * Drop a schema and remove it and its owned objects from the Database.
 *
 * @param {String} schemaName - A valid schema name to remove.
 * @param {Object} options - Additional options.
 * @param {Boolean} options.cascade - True to drop any objects that depend on
 * the schema.
 */
Massive.prototype.dropSchema = function(schemaName, options={}) {
  return this.query(`DROP SCHEMA IF EXISTS ${schemaName} ${options.cascade ? "CASCADE" : ""};`)
    .then(() => {
      // Remove all the tables from the namespace
      if (this[schemaName]) {
        _.each(Object.keys(this[schemaName]), key => {
          const entity = this[schemaName][key];
          let collection = 'tables';

          if (entity instanceof Queryable && !(entity instanceof Table)) {
            collection = 'views';
          } else if (_.isFunction(entity)) {
            collection = 'functions';
          }

          this.detach(`${schemaName}.${key}`, collection);
        });
      }

      // Remove the schema from the namespace
      delete this[schemaName];
    });
};

exports = module.exports = Massive;
