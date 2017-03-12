'use strict';


describe('dropTable', function () {
  const schema = 'spec';
  const tableName = 'doggies';
  const schemaTableName = `${schema}.${tableName}`;
  let db;

  before(function* () {
    db = yield resetDb('empty');
    yield db.createSchema('public');
  });

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
    before(function* () {
      yield db.createSchema(schema);
      yield db.createDocumentTable(schemaTableName);
    });

    it('removes the table from the specified schema', function() {
      return db.dropTable(schemaTableName, {cascade: true}).then(() => {
        assert.isUndefined(db[schema][tableName]);
      });
    });
  });
});
