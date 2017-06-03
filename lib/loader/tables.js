'use strict';

const queryFile = require('../util/query-file');

const tableSql = queryFile('tables.sql');
const tableWhiteListSql = queryFile('tables-whitelist.sql');

exports = module.exports = function (instance, config) {
  if (config.whitelist) {
      return instance.query(tableWhiteListSql, [config.whitelist]);
  } else {
      return instance.query(tableSql, [config.allowedSchemas, config.blacklist, config.exceptions]);
  }
};
