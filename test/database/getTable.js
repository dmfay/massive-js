'use strict';

describe('getTable', function () {
  const schema = 'spec';
  const tableName = 'doggies';
  const missingTableName = 'doges';
  let db;

  before(function* () {
    db = yield resetDb('empty');
    yield db.createSchema('public');
  });

  describe('without schema', function() {
    before(function() {
      return db.createDocumentTable(tableName);
    });
    after(function() {
      return db.dropTable(tableName, {cascade: true});
    });

    it('verifies the presence of the table in public schema', function () {
      assert.isOk(db.getTable(tableName));
      assert.isNotOk(db.getTable(missingTableName));
    });
  });

  describe('with schema', function() {
    const schemaTableName = `${schema}.${tableName}`;
    const missingSchemaTableName = `${schema}.${missingTableName}`;

    before(function* () {
      yield db.createSchema(schema);
      yield db.createDocumentTable(schemaTableName);
    });
    after(function*() {
      yield db.dropTable(schemaTableName, {cascade: true});
      yield db.dropSchema(schema, {cascade: true});
    });

    it('verifies the presence of the table in the specified schema', function () {
      assert.isOk(db.getTable(schemaTableName));
      assert.isNotOk(db.getTable(missingSchemaTableName));
    });
  });
});
