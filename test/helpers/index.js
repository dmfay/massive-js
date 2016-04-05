var massive = require("../..");
var connectionString = "postgres://postgres@localhost/massive";
var path = require("path");
var assert = require("assert");
var scriptsDir = path.join(__dirname, "..", "db");

exports.connectionString = connectionString;

exports.init = function() {
  return massive({
    connectionString : connectionString,
    scriptsDir : scriptsDir
  });
};

exports.resetDb = function() {
  return this.init()
    .then(function(db) {

      return db.schema()
        .then(function() {
          return db;
        });
    }, function(err) {
      assert.ifError(err);
    });
};

before(function() {
  return exports.resetDb();
});
