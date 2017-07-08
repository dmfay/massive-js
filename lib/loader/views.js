'use strict';

exports = module.exports = function (instance, config) {
  if (config.whitelist) {
    return instance.query(config.queryFiles['views-whitelist.sql'], [config.whitelist]);
  } else {
    return instance.query(config.queryFiles['views.sql'], [config.allowedSchemas, config.blacklist, config.exceptions]);
  }
};
