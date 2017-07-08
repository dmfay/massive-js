'use strict';

const Table = require('../../lib/table');

describe('createDocumentTable', function () {
  const schema = 'spec';
  const tableName = 'doggies';
  let db;

  before(function () {
    return resetDb('empty').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  describe('without schema', function() {
    after(function() {
      return db.dropTable(tableName, {cascade: true});
    });

    it('creates a table on public schema', function() {
      return db.createDocumentTable(tableName).then(() => {
        assert.isOk(db[tableName]);
        assert.instanceOf(db[tableName], Table);
        assert.lengthOf(db.tables, 1);
      });
    });
  });

  describe('with schema', function() {
    const schemaTableName = `${schema}.${tableName}`;

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
        assert.lengthOf(db.tables, 1);
      });
    });
  });
});
