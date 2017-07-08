'use strict';

exports = module.exports = function (instance, config) {
  if (config.whitelist) {
      return instance.query(config.queryFiles['tables-whitelist.sql'], [config.whitelist]);
  } else {
      return instance.query(config.queryFiles['tables.sql'], [config.allowedSchemas, config.blacklist, config.exceptions]);
  }
};
