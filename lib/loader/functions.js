'use strict';

const _ = require('lodash');
const path = require('path');
const co = require('co');
const pgp = require('pg-promise');

const functionSql = new pgp.QueryFile(path.join(__dirname, '/../scripts/functions.sql'), {minify: true});

exports = module.exports = co.wrap(function* (driver, config) {
  if (config.excludeFunctions) { return []; }

  const parameters = [config.functionBlacklist, config.functionWhitelist];

  const fns = yield driver.query(functionSql, parameters);

  return fns.map(fn => {
    const params = _.times(fn.param_count, i => `$${i + 1}`).join(',');

    fn.sql = `SELECT * FROM "${fn.schema}"."${fn.name}"(${params})`;

    return fn;
  });
});

