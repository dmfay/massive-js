'use strict';
const co = require("co");
const pg = require("pg");
const fs = require("mz/fs");
const _ = require("underscore")._;
const QueryStream = require('pg-query-stream');
const Query = require("./query");
const format = require("./formatters");

//Prototype for the DB namespace
const DB = function(config) {
  if (config.connectionString) {
    this.connectionString = config.connectionString;
  } else {
    this.pool = new pg.Pool({
      user: config.user,
      password: config.password,
      database: config.database,
      host: config.host || "localhost",
      port: config.port || 5432,
      max: config.max || 10,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000
    });
  }

  this.defaults = config.defaults;

  if (config.defaults) {
    _.each(config.defaults, function (v, k) {
      pg.defaults[k] = v;
    });
  }
};

DB.prototype.query = function () {
  const e = new Error();
  let connect, returnToPool;
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

  if (this.connectionString) {
    connect = new Promise((resolve, reject) => {
      pg.connect(this.connectionString, function (err, client, done) {
        returnToPool = done;

        if (err) { return reject(err); }

        return resolve(client);
      });
    });
  } else {
    connect = new Promise((resolve, reject) => {
      this.pool.connect((err, client, done) => {
        returnToPool = done;

        if (err) { return reject(err); }

        return resolve(client);
      });
    });
  }

  let promise = connect.then(db => new Promise((resolve, reject) => {
    if (options.stream) {
      const qs = new QueryStream(sql, params);
      const stream = db.query(qs);

      if (returnToPool) { stream.on('end', returnToPool); }

      return resolve(stream);
    }

    db.query(sql, params, (err, result) => {
      if (returnToPool) { returnToPool(); }
      if (err) { return reject(err); }

      if (options.single) {
        result.rows = result.rows.length >= 0 ? result.rows[0] : null;
      }

      return resolve(result.rows);
    });
  })).catch(err => {
    if (err.toString().indexOf("there is no parameter") > -1) {
      e.message = "You need to wrap your parameter into an array";
    } else {
      e.message = err.message || err.toString();
      e.code = err.code;
      e.detail = err.detail;
    }

    throw _.defaults(e, err);
  });

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

// close connections immediately
DB.prototype.end = function(){
  pg.end();
};

module.exports = DB;
