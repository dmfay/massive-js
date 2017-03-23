'use strict';

const co = require('co');
const path = require('path');
const pgp = require('pg-promise');

exports = module.exports = co.wrap(function* (driver, config) {
  let viewSql = path.resolve(__dirname, '../scripts/views.sql');
  let parameters = [config.allowedSchemas, config.blacklist, config.exceptions];

  // ONLY allow whitelisted items:
  if (config.whitelist) {
    viewSql = path.resolve(__dirname, '../scripts/views-whitelist.sql');
    parameters = [config.whitelist];
  }

  return yield driver.query(new pgp.QueryFile(viewSql), parameters);
});

