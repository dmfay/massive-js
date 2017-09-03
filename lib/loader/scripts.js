'use strict';

const glob = require('glob');
const path = require('path');
const pgp = require('pg-promise');
const patterns = require('pg-promise/lib/patterns');

const loadedFiles = [];

exports = module.exports = (instance, config) => new Promise((resolve, reject) => {
  glob(`${config.scripts}/**/*.sql`, (err, files) => {
    if (err) {
      reject(err);
    } else {
      resolve(files);
    }
  });
}).then(files => files.map(f => {
  const extant = loadedFiles.find(qf => qf.file === f);

  const script = {
    schema: path.relative(config.scripts, path.dirname(f)).replace(path.sep, '.'),
    name: path.basename(f, '.sql'),
    sql: extant || new pgp.QueryFile(f, {minify: true})
  };

  if (!extant) {
    loadedFiles.push(script.sql);
  }

  const rawSQL = script.sql.toPostgres();
  const valuesMatch = rawSQL.match(patterns.multipleValues);
  const namesMatch = rawSQL.match(patterns.namedParameters);

  script.paramCount = (valuesMatch && valuesMatch.length || 0) + (namesMatch && namesMatch.length || 0);

  return script;
}));
