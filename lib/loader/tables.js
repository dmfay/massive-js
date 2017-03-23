'use strict';

const co = require('co');
const path = require('path');
const pgp = require('pg-promise');

exports = module.exports = co.wrap(function* (driver, config) {
  let tableSql = path.resolve(__dirname, '../scripts/tables.sql');
  let parameters = [config.allowedSchemas, config.blacklist, config.exceptions];

  // ONLY allow whitelisted items:
  if (config.whitelist) {
    tableSql = path.resolve(__dirname, '../scripts/tables-whitelist.sql');
    parameters = [config.whitelist];
  }

  return yield driver.query(new pgp.QueryFile(tableSql), parameters);
});

