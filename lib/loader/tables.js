'use strict';

const co = require('co');
const path = require('path');
const pgp = require('pg-promise');

function sql(file) {
  var fullPath = path.join(__dirname, '../scripts/', file);
  return new pgp.QueryFile(fullPath, {minify: true});  
}

let tableSql = sql('tables.sql');
let tableWhiteListSql = sql('tables-whitelist.sql');

exports = module.exports = co.wrap(function* (driver, config) { 
  if(config.whitelist) {
      return yield driver.query(tableWhiteListSql, [config.whitelist]);  
  } else {
      return yield driver.query(tableSql, [config.allowedSchemas, config.blacklist, config.exceptions]);  
  }
});

