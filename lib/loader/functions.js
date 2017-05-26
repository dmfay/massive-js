'use strict';

const _ = require('lodash');
const queryFile = require('../util/query-file');

const functionSql = queryFile('functions.sql');

exports = module.exports = function (driver, config) {
  if (config.excludeFunctions) { return []; }

  const parameters = [config.functionBlacklist, config.functionWhitelist];

  return driver.query(functionSql, parameters).then(fns => {
    return fns.map(fn => {
      const params = _.times(fn.param_count, i => `$${i + 1}`).join(',');

      fn.sql = `SELECT * FROM "${fn.schema}"."${fn.name}"(${params})`;

      return fn;
    });
  });
};
