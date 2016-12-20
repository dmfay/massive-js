const assert = require("chai").assert;
const co = require("co");
const Table = require("../lib/table");

describe('Document table', function () {
  const schema = "spec";
  const tableName = "doggies";
  const schemaTableName = `${schema}.${tableName}`;
  var db;

  before(function() {
    return resetDb().then(instance => db = instance);
  });

  describe('create', function() {
    describe('without schema', function() {
      after(function() {
        return db.dropTable(tableName, {cascade: true});
      });

      it('creates a table on public schema', function() {
        return db.createDocumentTable(tableName).then(() => {
          assert.isOk(db[tableName]);
          assert.instanceOf(db[tableName], Table);
        });
      });
    });

    describe('with schema', function() {
      before(function() {
        return db.createSchema(schema);
      });

      after(function() {
        return db.dropSchema(schema, {cascade: true});
      });

      it('creates a table on the specified schema', function() {
        return db.createDocumentTable(schemaTableName).then(() => {
          assert.isOk(db[schema][tableName]);
          assert.instanceOf(db[schema][tableName], Table);
        });
      });
    });
  });

  describe('drop', function() {
    describe('without schema', function() {
      before(function() {
        return db.createDocumentTable(tableName);
      });

      it('removes the table from public schema', function() {
        return db.dropTable(tableName, {cascade: true}).then(() => {
          assert.isUndefined(db[tableName]);
        });
      });
    });

    describe('with schema', function() {
      before(co.wrap(function* () {
        yield db.createSchema(schema);
        yield db.createDocumentTable(schemaTableName);
      }));

      it('removes the table from the specified schema', function() {
        return db.dropTable(schemaTableName, {cascade: true}).then(() => {
          assert.isUndefined(db[schema][tableName]);
        });
      });
    });
  });
});
