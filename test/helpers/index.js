var massive = require("../../index");
var connectionString = "postgres://postgres@localhost/massive";
var async = require('async');
var path = require("path");
var assert = require("assert");
var scriptsDir = path.join(__dirname, "..", "db");

exports.connectionString = connectionString;

exports.init = function(next) {
  massive.connect({
    connectionString : connectionString,
    scripts : scriptsDir
  }, next);
};

exports.resetDb = function(schema, next) {
  if (typeof schema === 'function') {
    next = schema;
    schema = 'default';
  }

  var self = this;

  self.init(function(err,db) {
    assert.ifError(err);

    db.run("select schema_name from information_schema.schemata where catalog_name = 'massive' and schema_name not like 'pg_%' and schema_name not like 'information_schema'", function (err, schemata) {
      assert.ifError(err);

      async.each(schemata, function (schema, next) {
        db.run('drop schema ' + schema.schema_name + ' cascade', next);  
      }, function (err) {
        assert.ifError(err);

        db.schemata[schema](function (err) {
          assert.ifError(err);

          self.init(next);  // reconnect to ensure all functions have been unloaded
        });
      });
    });
  });
};

