'use strict';

const queryFile = require('../util/query-file');

const viewSql = queryFile('views.sql');
const viewWhiteListSql = queryFile('views-whitelist.sql');

exports = module.exports = function (driver, config) {
  if (config.whitelist) {
      return driver.query(viewWhiteListSql, [config.whitelist]);
  } else {
      return driver.query(viewSql, [config.allowedSchemas, config.blacklist, config.exceptions]);
  }
};
