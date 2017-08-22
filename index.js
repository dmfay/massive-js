'use strict';

/** @module massive */

const Database = require('./lib/database');

/**
 * Connect to Postgres and initialize the data mapper.
 *
 * @param {Object|String} connection - Connection configuration object, or
 * connection string.
 * @param {Object} [loader={}] - Change Massive's startup parameters. To
 * blacklist or whitelist a schema or entity, provide its fully qualified name
 * (eg myschema.mytable) as an array value or member in a comma-separated list.
 * @param {Array|String} loader.blacklist - Omit specified tables and views.
 * @param {Array|String} loader.whitelist - Omit all but the specified tables
 * and views.
 * @param {Array|String} loader.functionBlacklist - Omit specified functions.
 * @param {Array|String} loader.functionWhitelist - Omit all but the specified
 * functions.
 * @param {Array|String} loader.allowedSchemas - Only load entities in the
 * specified schemata.
 * @param {Array|String} loader.exceptions - Omit specified tables and views.
 * @param {String} loader.scripts - Define the scripts directory relative to the
 * process working directory.
 * @param {Object} [driverConfig={}] - Pass configuration directly to
 * pg-promise.
 *
 * @return {Database} An initialized and connected data mapper.
 */
module.exports = (connection, loader = {}, driverConfig = {}) => {
  return (new Database(connection, loader, driverConfig)).reload();
};

/**
 * A database connection.
 */
module.exports.Database = Database;
