'use strict';

const _ = require('lodash');
const glob = require('glob');
const path = require('path');
const pgp = require('pg-promise');
const stream = require('stream');
const QueryStream = require('pg-query-stream');
const Executable = require('./executable');
const Readable = require('./readable');
const Writable = require('./writable');
const Entity = require('./entity');
const decompose = require('./util/decompose');
const docify = require('./util/docify');
const getFilterString = require('./util/get-filter-string');

const introspectors = {}; // store introspection scripts across reloads

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

  this.objects = [];
  this.loader = loader;
  this.driverConfig = driverConfig;
  this.pgp = pgp(driverConfig);
  this.instance = this.pgp(connection);
  this.$p = this.instance.$config.promise;
};

/**
 * Attach an entity to the connected instance.
 *
 * @param {Object|Array} entities - New Entity or list of Entities to add to the
 * instance.
 * @return {Array} All added entities.
 */
Database.prototype.attach = function (entities) {
  entities = _.castArray(entities);

  this.objects = this.objects.concat(entities);

  return entities.map(entity => {
    let executor;

    if (entity instanceof Executable) {
      executor = function () { return entity.invoke(...arguments); };

      // make sure we can distinguish functions from scripts, since multiple
      // signatures are allowed for the former but not the latter
      executor.isDatabaseFunction = entity.isDatabaseFunction;
    }

    // do we already have something at this location?
    const existing = _.get(this, entity.path);

    if (!existing) {
      _.set(this, entity.path, executor || entity);
    } else {
      // first make sure we're not about to override an existing executor or
      // object API function (findOne etc) with a new executor _unless_ it's a
      // case of a database function with multiple signatures

      if (executor && typeof existing === 'function' && executor.isDatabaseFunction !== existing.isDatabaseFunction) {
        throw new Error(`attempt to overwrite function at ${entity.path} is not allowed`);
      }

      // determine which entity is more "advanced": executor functions win out,
      // followed by Tables, which in turn define a superset of Readable
      // functionality. If neither the new nor the existing entity are anything
      // interesting, just use the new entity.

      const both = [executor || entity, existing];

      const winner = both.find(e => typeof e === 'function') ||
        both.find(e => e instanceof Writable) ||
        both.find(e => e instanceof Readable) ||
        entity;

      const loser = both.find(e => e !== winner);

      // determine the appropriate prototype for the new object based on the
      // types of _both_ entities: Writable > Readable > Executable > Entity.

      const newProto = _.cond([
        [() => both.some(e => e instanceof Writable), _.constant(Writable)],
        [() => both.some(e => e instanceof Readable), _.constant(Readable)],
        [() => both.some(e => typeof e === 'function'), _.constant(Executable)],
        [_.stubTrue, _.constant(Entity)]
      ])();

      // if we are about to change the type of this node in the entity tree,
      // make sure that nothing new coming in from the new entity will override
      // an already-attached function

      const isNewType = existing.prototype !== newProto && !(_.isFunction(existing) && newProto === Executable);

      if (isNewType) {
        for (const prop in entity) {
          if (
            typeof entity[prop] === 'function' &&
            typeof _.get(this, `${entity.path}.${prop}`) === 'function'
          ) {
            throw new Error(`collision of ${entity.path}.${prop} with previously-attached function`);
          }
        }
      }

      // set the new prototype and transfer properties of the object which won't
      // stay/become the node onto the object which will

      Object.setPrototypeOf(winner, newProto.prototype);

      _.assign(winner, loser);

      // update the entity tree

      _.set(this, entity.path, winner);
    }

    return executor || entity;
  });
};

/**
 * Forget an entity.
 *
 * @param {String} entityPath - Path to the entity.
 */
Database.prototype.detach = function (entityPath) {
  _.unset(this, entityPath);

  this.objects = _.reject(this.objects, e => e.path === entityPath);
};

/**
 * Remove all attached entities from the instance, returning it to the pre-
 * introspection state.
 */
Database.prototype.clean = function () {
  this.objects = this.objects.reduce((nothing, entity) => {
    const segment = entity.path.split('.')[0];

    if (this[segment]) {
      delete this[segment];
    }

    return [];
  }, []);
};

/**
 * Synchronize the database API with the current state by scanning for tables,
 * views, functions, and scripts. Objects and files which no longer exist are
 * cleared and new objects and files added.
 *
 * @return {Promise} The refreshed database.
 */
Database.prototype.reload = function () {
  this.clean();

  const initPromises = [
    // get the current schema; this is usually 'public' unless someone
    // configured search_path in Postgres
    this.query('SELECT current_schema')
      .then(([{current_schema}]) => {
        this.currentSchema = current_schema;
      })
  ];

  if (_.isEmpty(introspectors)) {
    // load our introspectors. These are stored on the module since they don't
    // change between reloads.
    initPromises.push(this.$p((resolve, reject) => {
      glob(path.join(__dirname, '/scripts/*.sql'), (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files);
        }
      });
    }).then(files => {
      files.forEach(file => {
        introspectors[path.basename(file)] = new pgp.QueryFile(file, {minify: true});
      });
    }));
  }

  // attach the introspection scripts
  this.loader.queryFiles = introspectors;

  return this.$p.all(initPromises).then(() => {
    // run introspections and flatten the results into a single list of Entities
    return this.$p.all(['tables', 'views', 'functions', 'scripts'].map(loader => {
      // first find and execute the loader function
      const loaderFunc = require(`./loader/${loader}`); // eslint-disable-line global-require

      return loaderFunc(this.instance, this.loader).then(loaded => {
        // then afterwards map whatever it got into objects defined by ctor
        return loaded.map(obj => {
          obj = _.extend(obj, this.loader);
          obj.db = this;
          obj.path = !obj.schema || obj.schema === this.currentSchema ? obj.name : [obj.schema, obj.name].join('.');
          obj.loader = loader;

          if (Object.hasOwnProperty.call(obj, 'is_insertable_into')) {
            if (obj.is_insertable_into) {
              return new (Function.prototype.bind.apply(Writable, [null, obj]))();
            }

            return new (Function.prototype.bind.apply(Readable, [null, obj]))();
          }

          return new (Function.prototype.bind.apply(Executable, [null, obj]))();
        });
      });
    }, [])).then(groupedObjects => {
      return _.flatten(groupedObjects);
    }).then(objs => {
      this.attach(objs);

      return this;
    });
  });
};

/**
 * List all the tables attached to the connected instance.
 *
 * @return {Array} A list of table paths.
 */
Database.prototype.listTables = function () {
  return this.objects.reduce((names, obj) => {
    if (obj.loader === 'tables') {
      names.push(obj.path);
    }

    return names;
  }, []);
};

/**
 * List all the views attached to the connected instance.
 *
 * @return {Array} A list of view paths.
 */
Database.prototype.listViews = function () {
  return this.objects.reduce((names, obj) => {
    if (obj.loader === 'views') {
      names.push(obj.path);
    }

    return names;
  }, []);
};

/**
 * List all the functions and scripts attached to the connected instance.
 *
 * @return {Array} A list of function paths.
 */
Database.prototype.listFunctions = function () {
  return this.objects.reduce((names, obj) => {
    if (obj instanceof Executable) {
      names.push(obj.path);
    }

    return names;
  }, []);
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
    try {
      sql = query.format();
    } catch (err) {
      return this.$p.reject(err);
    }

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

    promise = this.$p((resolve, reject) => this.instance
      .stream(qs, classicStream => {
        const readableStream = new stream.Readable({objectMode: true});

        classicStream.on('data', data => {
          readableStream.push(data);
        });

        classicStream.on('end', () => {
          readableStream.push(null);
        });

        readableStream._read = () => {};

        return resolve(readableStream);
      })
      .catch(reject));
  } else {
    promise = this.instance.query(sql, params, qrm);
  }

  if (options.document) {
    promise = promise.then(docify);
  } else if (options.decompose && !options.stream) {
    promise = promise.then(decompose.bind(null, options.decompose));

    if (options.single) {
      // decomposition requires an array, so pull it back out
      promise = promise.then(array => array[0]);
    }
  }

  return promise;
};

/**
 * Begin a task, returning a copy of the connected instance which will route all
 * queries made in the callback through the task scope.
 *
 * @param {Function} callback - A callback containing Massive API calls and SQL
 * queries to be made within the task scope.
 * @param {Object} [options] - Task options.
 * @param {String} [options.tag] - A tag for tracking the task's queries.
 * @return {Promise} A promise for the completed task, which will be fulfilled
 * if it succeeds and commits or rejected if it rolls back.
 */
Database.prototype.withConnection = function (callback, options = {}) {
  return this.instance.task(options, task => {
    const withTask = _.cloneDeep(this);

    withTask.instance = task;

    return callback(withTask);
  });
};

/**
 * Begin a transaction, returning a copy of the connected instance which will
 * route all queries made in the callback through the transaction scope.
 *
 * @param {Function} callback - A callback containing Massive API calls and SQL
 * queries to be made within the transaction scope.
 * @param {Object} [options] - Transaction options.
 * @param {TransactionMode} [options.mode] - A pg-promise TransactionMode.
 * @return {Promise} A promise for the completed transaction, which will be
 * fulfilled if it succeeds and commits or rejected if it rolls back.
 */
Database.prototype.withTransaction = function (callback, options = {}) {
  return this.instance.tx(options, tx => {
    const withTx = _.cloneDeep(this);

    withTx.instance = tx;

    return callback(withTx);
  });
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
  if (collection.startsWith(`${this.currentSchema}.`)) {
    collection = collection.substring(this.currentSchema.length + 1);
  }

  const potentialTable = _.get(this, collection);

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
    this.attach(new Writable({
      db: this,
      schema: schemaName,
      name: tableName,
      columns: ['id', 'body', 'search', 'created_at'],
      pk: ['id']
    }))
  ).then(added => {
    return added[0];
  });
};

/**
 * Drop a table and remove it from the Database.
 *
 * @param {String} tablePath - Path to the table (including schema, if not
 * public).
 * @param {Object} options - Additional options.
 * @param {Boolean} options.cascade - True to drop any objects that depend on
 * the table.
 * @return {Promise} A promise which resolves when the table has been removed.
 */
Database.prototype.dropTable = function (tablePath, options) {
  const cascade = options && options.cascade;

  return this.query(`DROP TABLE IF EXISTS ${tablePath} ${cascade ? 'CASCADE' : ''};`)
    .then(() => {
      this.detach(tablePath);
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
      // Remove all objects from the namespace
      if (this[schemaName]) {
        _.each(Object.keys(this[schemaName]), key => {
          this.detach(`${schemaName}.${key}`);
        });
      }

      // Remove the schema from the namespace
      delete this[schemaName];
    });
};

exports = module.exports = Database;
