'use strict';

const co = require('co');
const pgp = require('pg-promise');

exports = module.exports = co.wrap(function* (driver, config) {
  let tableSql = __dirname + "/../scripts/tables.sql";
  let parameters = [config.allowedSchemas, config.blacklist, config.exceptions];

  // ONLY allow whitelisted items:
  if (config.whitelist) {
    tableSql = __dirname + "/../scripts/whitelist.sql";
    parameters = [config.whitelist];
  }

  return yield driver.query(new pgp.QueryFile(tableSql), parameters);
});

