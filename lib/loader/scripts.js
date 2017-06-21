'use strict';

const glob = require('glob');
const path = require('path');
const pgp = require('pg-promise');
const patterns = require('pg-promise/lib/patterns');

exports = module.exports = (instance, config) => new Promise((resolve, reject) => {
  glob(`${config.scripts}/**/*.sql`, (err, files) => {
    if (err) { reject(err); }
    else { resolve(files); }
  });
}).then(files => files.map(f => {
  const queryFile = new pgp.QueryFile(f, {minify: true});
  const sql = queryFile.formatDBType();
  const valuesMatch = sql.match(patterns.multipleValues);
  const namesMatch = sql.match(patterns.namedParameters);

  return {
    schema: path.relative(config.scripts, path.dirname(f)).replace(path.sep, '.'),
    name: path.basename(f, '.sql'),
    sql: queryFile,
    paramCount: (valuesMatch && valuesMatch.length || 0) + (namesMatch && namesMatch.length || 0)
  };
}));
