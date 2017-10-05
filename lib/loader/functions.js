'use strict';

const _ = require('lodash');

exports = module.exports = function (instance, config) {
  if (config.excludeFunctions) { return []; }

  return instance.query(config.queryFiles['functions.sql'], config).then(fns => {
    return fns.map(fn => {
      const params = _.times(fn.paramCount, i => `$${i + 1}`).join(',');

      fn.sql = `SELECT * FROM "${fn.schema}"."${fn.name}"(${params})`;

      return fn;
    });
  });
};
