'use strict';

const path = require('path');
const pgp = require('pg-promise');

exports = module.exports = function (file) {
  return new pgp.QueryFile(path.join(__dirname, '/../scripts', file), {minify: true});
};
