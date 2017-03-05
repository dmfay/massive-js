'use strict';

const co = require('co');
const fs = require('mz/fs');
const QueryStream = require('pg-query-stream');
const Query = require('./query/query');
const format = require('./formatters');

//Prototype for the DB namespace
const DB = function (connection, config) {
  const pgp = require('pg-promise')(config || {});

  this.driver = pgp(connection);
  this.qrm = pgp.queryResult;
  this.QueryFile = pgp.QueryFile;
};

DB.prototype.query = function () {
  let sql, params, options;

  if (arguments[0] instanceof Query) {
    sql = arguments[0].format();
    params = arguments[0].where.params;
    options = arguments[0];
  } else {
    sql = arguments[0];
    params = arguments[1];
    options = arguments[2] || {};
  }

  let qrm;

  if (options.single) {
    qrm = this.qrm.one | this.qrm.none;
  } else {
    qrm = this.qrm.any;
  }

  let promise;

  if (options.stream) {
    const qs = new QueryStream(sql, params);

    promise = new Promise((resolve, reject) => this.driver.stream(qs, resolve).catch(reject));
  } else {
    promise = this.driver.query(sql, params, qrm);
  }

  if (options.document) {
    promise = promise.then(format);
  }

  return promise;
};

//convenience function
DB.prototype.executeSqlFile = co.wrap(function* (args) {
  const sql = yield fs.readFile(args.file, {encoding: 'utf-8'});

  return yield this.query(sql, args.params);
});

exports = module.exports = DB;
