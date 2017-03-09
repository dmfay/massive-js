'use strict';

const _ = require('lodash');
const co = require('co');
const pgp = require('pg-promise');

exports = module.exports = co.wrap(function* (driver, config) {
  if (config.excludeFunctions) { return; }

  const functionSql = __dirname + "/../scripts/functions.sql";
  const parameters = [config.functionBlacklist, config.functionWhitelist];

  const fns = yield driver.query(new pgp.QueryFile(functionSql), parameters);

  return fns.map(fn => {
    const params = _.times(fn.param_count, i => `$${i + 1}`).join(',');

    fn.sql = `SELECT * FROM "${fn.schema}"."${fn.name}"(${params})`;

    return fn;
  });
});

