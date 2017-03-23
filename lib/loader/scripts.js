'use strict';

const fs = require('mz/fs');
const glob = require('glob');
const path = require('path');

exports = module.exports = (driver, config) => new Promise((resolve, reject) => {
  glob(`${config.scripts}/**/*.sql`, (err, files) => {
    if (err) { return reject(err); }

    return resolve(files);
  });
}).then(files => {
  return Promise.all(files.map(f => {
    return fs.readFile(f, {encoding: 'utf-8'}).then(sql => Promise.resolve({
      sql: sql,
      filePath: f,
      schema: path.relative(config.scripts, path.dirname(f)).replace(path.sep, '.'),
      name: path.basename(f, '.sql')
    }));
  }));
});

