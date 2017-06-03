'use strict';

const glob = require('glob');
const path = require('path');
const pgp = require('pg-promise');

exports = module.exports = (instance, config) => new Promise((resolve, reject) => {
  glob(`${config.scripts}/**/*.sql`, (err, files) => {
    if (err) { return reject(err); }

    return resolve(files);
  });
}).then(files => Promise.resolve(files.map(f => {
  return {
    schema: path.relative(config.scripts, path.dirname(f)).replace(path.sep, '.'),
    name: path.basename(f, '.sql'),
    sql: new pgp.QueryFile(f, {minify: true})
  };
})));
