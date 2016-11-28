var assert = require("chai").assert;
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
    after(function() {
      return db.dropSchema(schemaName, {cascade: true}).then(() => {
        assert.equal(db[schemaName], undefined);
      });
    });

    it("adds a new schema", function() {
      return db.createSchema(schemaName).then(() => {
        assert(_.isEqual(db[schemaName], {}), 'should be an empty object');
      });
    });
  });

  describe("drop", function() {
    beforeEach(function() {
      return db.createSchema(schemaName).then(db.createDocumentTable.bind(db, schemaTableName));
    });

    after(function() {
      return db.dropSchema(schemaName, {cascade: true});
    });

    it("removes a schema and underlying table with cascade option", function() {
      return db.dropSchema(schemaName, {cascade: true}).then(() => {
        assert.isUndefined(db[schemaName]);
      });
    });

    it("fails to remove schema and underlying tables without cascade", function() {
      return db.dropSchema(schemaName, {cascade: false}).catch(err => {
        assert.isOk(err !== null, "should callback with error");
      });
    });
  });
});
