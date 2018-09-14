'use strict';

exports = module.exports = function (instance, config) {
  return instance.query(config.queryFiles['sequences.sql'], config);
};
