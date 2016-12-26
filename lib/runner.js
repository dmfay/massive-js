const co = require("co");
const pg = require("pg");
const fs = require("mz/fs");
const _ = require("underscore")._;
const ArgTypes = require("./arg_types");
const QueryStream = require('pg-query-stream');

//Prototype for the DB namespace
const DB = function(connectionString, defaults) {
  this.connectionString = connectionString;
  this.defaults = defaults;

  if (defaults) {
    _.each(defaults, function (v, k) {
      pg.defaults[k] = v;
    });
  }
};

DB.prototype.query = function () {
  //we expect sql, options, params and a callback
  const args = ArgTypes.queryArgs(arguments);
  const e = new Error();

  //check to see if the params are an array, which they need to be
  //for the pg module
  if (_.isObject(args.params)) {
    //we only need the values from the object, so swap it out
    args.params = _.values(args.params);
  }

  //weird param bug that will mess up multiple statements with the pg_node driver
  if(args.params === [{}]) args.params = [];

  var connect, returnToPool;

  if (this.connectionString) {
    connect = new Promise((resolve, reject) => {
      pg.connect(this.connectionString, function (err, client, done) {
        returnToPool = done;

        if (err) { return reject(err); }

        return resolve(client);
      });
    });
  } else {
    // TODO finish me (not currently invoked)
    if (!this.pool) {
      this.pool = new pg.Pool({});
    }

    connect = new Promise((resolve, reject) => {
      this.pool.connect((err, client, done) => {
        returnToPool = done;

        if (err) { return reject(err); }

        return resolve(client);
      });
    });
  }

  return connect.then(db => new Promise((resolve, reject) => {
    db.query(args.sql, args.params, (err, result) => {
      //we have the results, release the connection
      if (!!returnToPool) { returnToPool(); }
      if (err) { return reject(err); }

      //only return one result if single is sent in
      if (args.options.single) {
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
};

DB.prototype.stream = function () {
  //we expect sql, options, params and a callback
  var args = ArgTypes.queryArgs(arguments);

  //check to see if the params are an array, which they need to be
  //for the pg module
  if(_.isObject(args.params)){
    //we only need the values from the object,
    //so swap it out
    args.params = _.values(args.params);
  }

  //weird param bug that will mess up multiple statements
  //with the pg_node driver
  if(args.params === [{}]) args.params = [];

  pg.connect(this.connectionString, function (err, db, done) {
    if (err) {
      done();

      return args.next(err,null);
    }

    var query = new QueryStream(args.sql, args.params);

    var stream = db.query(query);

    stream.on('end', done);

    args.next(null, stream);
  });
};

//convenience function
DB.prototype.executeSqlFile = co.wrap(function* (args) {
  const sql = yield fs.readFile(args.file, {encoding: 'utf-8'});

  return yield this.query({sql: sql, params: args.params});
});

// close connections immediately
DB.prototype.end = function(){
  pg.end();
};

module.exports = DB;
