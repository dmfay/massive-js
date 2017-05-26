'use strict';

const queryFile = require('../util/query-file');

const tableSql = queryFile('tables.sql');
const tableWhiteListSql = queryFile('tables-whitelist.sql');

exports = module.exports = function (driver, config) {
  if (config.whitelist) {
      return driver.query(tableWhiteListSql, [config.whitelist]);
  } else {
      return driver.query(tableSql, [config.allowedSchemas, config.blacklist, config.exceptions]);
  }
};

