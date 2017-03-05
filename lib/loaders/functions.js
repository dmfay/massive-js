'use strict';

const co = require('co');
const pgp = require('pg-promise');

exports = module.exports = co.wrap(function* (driver, config) {
  if (config.excludeFunctions) { return; }

  const functionSql = __dirname + "/../scripts/functions.sql";
  const parameters = [config.functionBlacklist, config.functionWhitelist];

  return yield driver.query(new pgp.QueryFile(functionSql), parameters);
});

