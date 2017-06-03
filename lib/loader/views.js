'use strict';

const queryFile = require('../util/query-file');

const viewSql = queryFile('views.sql');
const viewWhiteListSql = queryFile('views-whitelist.sql');

exports = module.exports = function (instance, config) {
  if (config.whitelist) {
      return instance.query(viewWhiteListSql, [config.whitelist]);
  } else {
      return instance.query(viewSql, [config.allowedSchemas, config.blacklist, config.exceptions]);
  }
};
