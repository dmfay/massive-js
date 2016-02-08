var pg = require("pg");
var fs = require("fs");
var assert = require("assert");
var _ = require("underscore")._;
var ArgTypes = require("./arg_types");
var QueryStream = require('pg-query-stream');
var transaction = false;

//Prototype for the DB namespace
var DB = function(connectionString){
  assert.ok(connectionString, "Need a connection string");
  this.connectionString = connectionString;
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

  //if we're in a transaction, use the transaction-connection
  if(transaction){
    runQuery(transaction.db, transaction.done, true);
  } else {
    pg.connect(this.connectionString, function (err, db, done) {
      //throw if there's a connection error
      //assert.ok(err === null, err);
      if(err){
        done();
        args.next(err,null);
      }else{
        runQuery(db, done, false);
      }
    });
  }
  function runQuery(db, done, insideTx){
    db.query(args.sql, args.params, function (err, result) {
      
      if(!insideTx){
        //we have the results, release the connection
        done();
      }
       // handle db.begin() - store this connection, don't release it
      if(args.options["begin"]){
        assert.ok(transaction === false, "There is already a transaction active, can't db.begin() again");
        transaction = {"db": db, "done": done};
      }
      // handle db.commit()/rollback() - release the connection again
      else if(args.options["commit"] || args.options["rollback"]){
        assert.ok(_.isObject(transaction) && insideTx, "No transaction active");
        done(); // release transaction-connection
        transaction = false;
      }

      if (err) {
        //DO NOT THROW if there's a query error
        //bubble it up
        //handle if it's that annoying parameter issue
        //wish I could find a way to deal with this
        if (err.toString().indexOf("there is no parameter") > -1) {
          e.message = "You need to wrap your parameter into an array";
        } else {
          e.message = err.message || err.toString();
        }
      
        // Automatically rollback if we're in a transaction. Check 'insideTx' variable (not 'transaction')
        // because we might have overwriteen the transaction variable above.
        if(insideTx){
          transaction = false;
          db.query("rollback", function(){
            done();
          });
        }

        args.next(e, null);
      } else {
        //only return one result if single is sent in
        if (args.options.single) {
          result.rows = result.rows.length >= 0 ? result.rows[0] : null;
        }

        args.next(null, result.rows);
      }
    });
  }
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
    //throw if there's a connection error
    assert.ok(err === null, err);

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
