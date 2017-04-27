'use strict';

describe('hasTable', function () {
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
      assert.equal(db.hasTable(tableName), true);
      assert.equal(db.hasTable(missingTableName), false);
    });
  });

  describe('with schema', function() {
    const schemaTableName = `${schema}.${tableName}`;
    const missingSchemaTableName = `${schema}.${tableName}`;

    before(function* () {
      yield db.createSchema(schema);
      yield db.createDocumentTable(schemaTableName);
    });
    after(function*() {
      yield db.dropTable(schemaTableName, {cascade: true});
      yield db.dropSchema(schema, {cascade: true});
    });

    it('verifies the presence of the table in the specified schema', function () {
      assert.equal(db.hasTable(schemaTableName), true);
      assert.equal(db.hasTable(missingSchemaTableName), false);
    });
  });
});
