var massive = require("../../index");
var connectionString = "postgres://postgres@localhost/massive";
var assert = require("assert");
var path = require("path");
var scriptsDir = path.join(__dirname, "..", "db");

exports.connectionString = connectionString;

exports.init = function(next){
  massive.connect({
    connectionString : connectionString,
    scripts : scriptsDir}, next);
};

exports.resetDb = function(next){
  this.init(function(err,db){
    assert(!err,err);
    db.schema(function(err, res){
      assert(!err,err);
      next(null, db);
    });
  });
};

before(function(done){
  exports.resetDb(done);
});

