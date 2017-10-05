'use strict';

const _ = require('lodash');
const glob = require('glob');
const path = require('path');
const pgp = require('pg-promise');
const QueryStream = require('pg-query-stream');
const Executable = require('./executable');
const Queryable = require('./queryable');
const Table = require('./table');
const decompose = require('./util/decompose');
const docify = require('./util/docify');
const getFilterString = require('./util/get-filter-string');

/**
 * A database connection.
 *
 * @class Database
 * @param {Object|String} connection - A pg connection object or a connection
 * string.
 * @param {Object} [loader] - Filter definition for including and
 * excluding database objects. If nothing is specified, Massive loads every
 * table, view, and function visible to the connection's user.
 * @param {String} loader.scripts - Override the Massive script file location
 * (default ./db).
 * @param {Array|String} loader.allowedSchemas - Table/view schema whitelist.
 * @param {Array|String} loader.whitelist - Table/view name whitelist.
 * @param {Array|String} loader.blacklist - Table/view name blacklist.
 * @param {Array|String} loader.exceptions - Table/view blacklist exceptions.
 * @param {Array|String} loader.functionWhitelist - Function name whitelist.
 * @param {Array|String} loader.functionBlacklist - Function name blacklist.
 * @param {Boolean} loader.enhancedFunctions - Streamline function return values.
 * @param {Boolean} loader.excludeFunctions - Ignore functions entirely.
 * @param {Boolean} loader.excludeMatViews - Ignore materialized views.
 * @param {Object} [driverConfig] - A pg-promise configuration object.
 */
const Database = function (connection = {}, loader = {}, driverConfig = {}) {
  connection = typeof connection === 'string'
    ? {connectionString: connection}
    : connection;

  // If connectionString is defined in the configuration object, these defaults will be ignored
  _.defaults(connection, {
    host: 'localhost',
    port: 5432
  });

  ['blacklist', 'whitelist', 'functionBlacklist', 'functionWhitelist', 'exceptions'].forEach(key => {
    loader[key] = getFilterString(loader[key]);
  });

  loader.allowedSchemas = getFilterString(loader.allowedSchemas);
  loader.scripts = loader.scripts || path.join(process.cwd(), 'db');

  this.loader = loader;
  this.driverConfig = driverConfig;
  this.pgp = pgp(driverConfig);
  this.instance = this.pgp(connection);
  this.run = this.instance.query;
  this.$p = this.instance.$config.promise;
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
 * @param {Promise|Function} sources - Something which resolves to a list of entity
 * specifications.
 * @return {Promise} The collection of objects just attached.
 */
Database.prototype.attach = function (ctor, ...sources) {
  const sourcePromises = sources.map(source => {
    if (_.isFunction(source)) {
      return source(this.instance, this.loader);
    }

    return source;
  });

  return this.$p.all(sourcePromises).then(result => {
    return _.flatten(result).map(spec => {
      spec = _.extend(spec, this.loader);
      spec.db = this;
      spec.path = !spec.schema || spec.schema === this.currentSchema ? spec.name : [spec.schema, spec.name].join('.');

      const entity = new (Function.prototype.bind.apply(ctor, [null, spec]))();
      let executor;

      if (ctor === Executable) {
        executor = function () { return entity.invoke(...arguments); };
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
Database.prototype.detach = function (entity, collection = 'tables') {
  // TODO should be able to determine collection from entity type
  let schema = this.currentSchema;

  if (entity.indexOf('.') > -1) {
    const tokens = entity.split('.');

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
 * Synchronize the database API with the current state by scanning for tables,
 * views, functions, and scripts. Objects and files which no longer exist are
 * cleared and new objects and files added.
 *
 * @return {Promise} The refreshed database.
 */
Database.prototype.reload = function () {
  if (this.tables) { this.tables.forEach(t => this.detach(t.name, 'tables')); }
  if (this.views) { this.views.forEach(v => this.detach(v.name, 'views')); }
  if (this.functions) { this.functions.forEach(f => this.detach(f.name, 'functions')); }

  let filesPromise;

  if (!this.loader.queryFiles) {
    filesPromise = this.$p((resolve, reject) => {
      glob(path.join(__dirname, '/scripts/*.sql'), (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files);
        }
      });
    }).then(files => {
      this.loader.queryFiles = files.reduce((collection, file) => {
        collection[path.basename(file)] = new pgp.QueryFile(file, {minify: true});

        return collection;
      }, {});
    });
  } else {
    filesPromise = this.$p.resolve();
  }

  const schemaPromise = this.run('SELECT current_schema')
    .then(([{current_schema}]) => {
      this.currentSchema = current_schema;
    });

  return this.$p.all([schemaPromise, filesPromise]).then(() => {
    return this.$p.all([
      /* eslint-disable global-require */
      this.attach(Table, require('./loader/tables')).then(tables => this.tables = tables),
      this.attach(Queryable, require('./loader/views')).then(views => this.views = views),
      this.attach(Executable, require('./loader/functions'), require('./loader/scripts')).then(functions => this.functions = functions)
      /* eslint-enable global-require */
    ]);
  }).then(() => this);
};

/**
 * Execute a query.
 *
 * @param {Select|Insert|Update|Delete|String} query - One of the four statement
 * objects, or a string containing a prepared SQL statement.
 * @param {Array} [params] - An array of the prepared statement parameters, if
 * applicable.
 * @param {Object} [options] - If using raw SQL, a subset of query options may be
 * applied.
 * @param {Boolean} options.document - This is a query against a document
 * table.
 * @param {Boolean} options.single - True to return a single result object
 * instead of an array of results.
 * @param {Boolean} options.stream - True to return a stream instead of a
 * resultset.
 * @return {Promise} Query results.
 */
Database.prototype.query = function (query, params = [], options = {}) {
  let sql;

  if (query instanceof this.pgp.QueryFile || _.isString(query)) {
    sql = query;
  } else {
    sql = query.format();
    params = query.params;
    options = query;
  }

  if (options.build) {
    return this.$p.resolve({sql, params});
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

    promise = this.$p((resolve, reject) => this.instance.stream(qs, resolve).catch(reject));
  } else {
    promise = this.instance.query(sql, params, qrm);
  }

  if (options.document) {
    promise = promise.then(docify);
  } else if (options.decompose && !options.stream) {
    promise = promise.then(decompose.bind(null, options.decompose));
  }

  return promise;
};

/**
 * Save a document.
 *
 * @param {String} collection - Document table name to save to. If it does not
 * already exist, it will be created.
 * @param {Object} doc - A JSON document.
 * @return {Promise} The saved document.
 */
Database.prototype.saveDoc = function (collection, doc) {
  const potentialTable = this.getObject(collection);

  if (potentialTable) {
    return potentialTable.saveDoc(doc);
  }

  return this.createDocumentTable(collection).then(() => this.saveDoc(collection, doc));
};

/**
 * Create a new document table and attach it to the Database for usage.
 *
 * @param {String} location - Name of the table to create. Unless the schema is
 * specified in a qualified path, current schema (usually 'public') is assumed.
 * @return {Promise} The added table.
 */
Database.prototype.createDocumentTable = function (location) {
  const splits = location.split('.');
  const tableName = splits.pop();
  const schemaName = splits.pop() || this.currentSchema;
  const indexName = tableName.replace('.', '_');

  return this.query(this.loader.queryFiles['document-table.sql'], {
    schema: schemaName,
    table: tableName,
    index: indexName
  }).then(() =>
    this.attach(Table, this.$p.resolve([{schema: schemaName, pk: 'id', name: tableName}]))
  ).then(added => {
    this.tables.push(added[0]);

    return added[0];
  });
};

/**
 * Find a database object, if attached.
 *
 * @param {String} location - Name of the object to find. Unless the schema is
 * specified in a qualified path, current schema (usually 'public') is assumed.
 * @param {String} [collection=tables] - Collection to search: tables, views, or
 * functions.
 * @return {Object} The table, if found.
 */
Database.prototype.getObject = function (location, collection = 'tables') {
  const splits = location.split('.');
  const name = splits.pop();
  const schema = splits.pop() || this.currentSchema;

  return this[collection].find(obj => obj.schema === schema && obj.name === name);
};

/**
 * Drop a table and remove it from the Database.
 *
 * @param {String} table - Name of the table to drop.
 * @param {Object} options - Additional options.
 * @param {Boolean} options.cascade - True to drop any objects that depend on
 * the table.
 * @return {Promise} A promise which resolves when the table has been removed.
 */
Database.prototype.dropTable = function (table, options) {
  const cascade = options && options.cascade;

  return this.query(`DROP TABLE IF EXISTS ${table} ${cascade ? 'CASCADE' : ''};`)
    .then(() => {
      this.detach(table);
    });
};

/**
 * Create a new schema in the database.
 *
 * @param {String} schemaName - A valid schema name.
 * @return {Promise} A promise which resolves when the schema has been added.
 */
Database.prototype.createSchema = function (schemaName) {
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
 * @return {Promise} A promise which resolves when the schema and all owned
 * objects have been removed.
 */
Database.prototype.dropSchema = function (schemaName, options = {}) {
  return this.query(`DROP SCHEMA IF EXISTS ${schemaName} ${options.cascade ? 'CASCADE' : ''};`)
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

exports = module.exports = Database;
