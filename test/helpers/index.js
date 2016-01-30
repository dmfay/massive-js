var massive = require("../../index");
var connectionString = "postgres://postgres@localhost/massive";
var path = require("path");
var assert = require("assert");
var scriptsDir = path.join(__dirname, "..", "db");

exports.connectionString = connectionString;

exports.init = function(next){
  massive.connect({
    connectionString : connectionString,
    scripts : scriptsDir}, next);
};

exports.resetDb = function(next){
  this.init(function(err,db){
    assert.ifError(err);

    db.schema(function(err){
      assert.ifError(err);

      next(null, db);
    });
  });
};

before(function(done){
  exports.resetDb(done);
});
