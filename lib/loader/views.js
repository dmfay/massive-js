'use strict';

const co = require('co');
const path = require('path');
const pgp = require('pg-promise');

function sql(file) {
  var fullPath = path.join(__dirname, '../scripts/', file);
  return new pgp.QueryFile(fullPath, {minify: true});
}

let viewSql = sql('views.sql');
let viewWhiteListSql = sql('views-whitelist.sql');

exports = module.exports = co.wrap(function* (driver, config) {
  if(config.whitelist) {
      return yield driver.query(viewWhiteListSql, [config.whitelist]);
  } else {
      return yield driver.query(viewSql, [config.allowedSchemas, config.blacklist, config.exceptions]);
  }  
});
