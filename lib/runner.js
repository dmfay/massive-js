var pg = require("pg");
var fs = require("fs");
var _ = require("underscore")._;
var ArgTypes = require("./arg_types");
var QueryStream = require('pg-query-stream');

//Prototype for the DB namespace
var DB = function(connectionString, defaults) {
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
  var args = ArgTypes.queryArgs(arguments);
  var e = new Error();  // initialize error object before we do any async stuff to get a useful stacktrace

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

    db.query(args.sql, args.params, function (err, result) {
      //we have the results, release the connection
      done();

      if (err) {
        //DO NOT THROW if there's a query error
        //bubble it up
        //handle if it's that annoying parameter issue
        //wish I could find a way to deal with this
        if (err.toString().indexOf("there is no parameter") > -1) {
          e.message = "You need to wrap your parameter into an array";
        } else {
          e.message = err.message || err.toString();
          e.code = err.code;
          e.detail = err.detail;
        }

        args.next(_.defaults(e, err), null);
      } else {
        //only return one result if single is sent in
        if (args.options.single) {
          result.rows = result.rows.length >= 0 ? result.rows[0] : null;
        }

        args.next(null, result.rows);
      }
    });
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
DB.prototype.executeSqlFile = function(args,next){
  var self = this;
  var fileSql = fs.readFileSync(args.file, {encoding: 'utf-8'});
  self.query({sql:fileSql, params: args.params, next: next});
};

// close connections immediately
DB.prototype.end = function(){
  pg.end();
};

module.exports = DB;
