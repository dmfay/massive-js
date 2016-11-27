var assert = require("assert");
var helpers = require("./helpers");
var _ = require("underscore")._;
var db;

describe("Schema", function() {
  var schemaName = "spec";
  var tableName = "doggies";
  var schemaTableName = schemaName + "." + tableName;

  before(function() {
    return helpers.resetDb("empty").then(instance => db = instance);
  });

  describe("create", function() {

    after(function(done) {
      db.dropSchema(schemaName, {cascade: true}, function(err) {
        assert.ifError(err);
        assert.equal(db[schemaName], undefined);
        done();
      });
    });

    it("adds a new schema", function(done) {
      db.createSchema(schemaName, function(err) {
        assert.ifError(err);
        assert(_.isEqual(db[schemaName], {}), 'should be an empty object');
        done();
      });
    });

  });

  describe("drop", function() {

    beforeEach(function(done) {
      db.createSchema(schemaName, function(err) {
        assert.ifError(err);
        db.createDocumentTable(schemaTableName, function(err) {
          assert.ifError(err);
          done();
        });
      });
    });

    after(function(done) {
      db.dropSchema(schemaName, {cascade: true}, function(err) {
        assert.ifError(err);
        done();
      });
    });

    it("removes a schema and underlying table with cascade option", function(done) {
      db.dropSchema(schemaName, {cascade: true}, function(err) {
        assert.ifError(err);
        assert.equal(db[schemaName], undefined);
        done();
      });
    });

    it("fails to remove schema and underlying tables without cascade", function(done) {
      db.dropSchema(schemaName, {cascade: false}, function(err) {
        assert(err !== null, "should callback with error");
        done();
      });
    });
  });
});
