'use strict';

const _ = require('lodash');
const path = require('path');
const filters = require('./lib/util/filters');
const Database = require('./lib/database');

/**
 * Connect to Postgres and initialize the data mapper.
 *
 * @exports massive
 *
 * @param {Object|String} connection - Connection configuration object, or
 * connection string.
 * @param {Object} [loaderConfig={}] - Change Massive's startup parameters. To
 * blacklist or whitelist a schema or entity, provide its fully qualified name
 * (eg myschema.mytable) as an array value or member in a comma-separated list.
 * @param {Array|String} loaderConfig.blacklist - Omit specified tables and
 * views.
 * @param {Array|String} loaderConfig.whitelist - Omit all but the specified
 * tables and views.
 * @param {Array|String} loaderConfig.functionBlacklist - Omit specified
 * functions.
 * @param {Array|String} loaderConfig.functionWhitelist - Omit all but the
 * specified functions.
 * @param {Array|String} loaderConfig.allowedSchemas - Only load entities in the
 * specified schemata.
 * @param {Array|String} loaderConfig.exceptions - Omit specified tables and
 * views.
 * @param {String} loaderConfig.scripts - Define the scripts directory relative
 * to the process working directory.
 * @param {Object} [driverConfig={}] - Pass configuration directly to
 * pg-promise.
 *
 * @return {Database} An initialized and connected data mapper.
 */
exports = module.exports = (connection, loaderConfig = {}, driverConfig = {}) => {
  if (!connection || _.isEmpty(connection)) {
    return Promise.reject('No connection information specified.');
  } else if (Object.keys(connection).length === 1 && (!!connection.database || !!connection.db)) {
    connection = `postgres://localhost:5432/${connection.database || connection.db}`;
  }

  ['blacklist', 'whitelist', 'functionBlacklist', 'functionWhitelist', 'exceptions'].forEach(key => {
    loaderConfig[key] = filters.entity(loaderConfig[key]);
  });

  loaderConfig.allowedSchemas = filters.schema(loaderConfig.allowedSchemas);
  loaderConfig.scripts = loaderConfig.scripts || path.join(process.cwd(), 'db');

  return (new Database(connection, loaderConfig, driverConfig)).reload();
};

