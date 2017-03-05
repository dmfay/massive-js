'use strict';

const co = require('co');
const pgp = require('pg-promise');

exports = module.exports = co.wrap(function* (driver, config) {
  const viewSql = __dirname + "/../scripts/views.sql";
  const parameters = [config.allowedSchemas, config.blacklist, config.exceptions];
  return yield driver.query(new pgp.QueryFile(viewSql), parameters);
});

