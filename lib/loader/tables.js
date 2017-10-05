'use strict';

exports = module.exports = function (instance, config) {
  return instance.query(config.queryFiles['tables.sql'], config);
};
