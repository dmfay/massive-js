'use strict';

describe('getObject', function () {
  const schema = 'spec';
  const tableName = 'doggies';
  const missingTableName = 'doges';
  let db;

  before(function () {
    return resetDb('empty').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  describe('public schema', function () {
    before(function () {
      return db.createDocumentTable(tableName);
    });

    after(function () {
      return db.dropTable(tableName, {cascade: true});
    });

    it('verifies the presence of a table in public schema', function () {
      assert.isOk(db.getObject(tableName));
      assert.isNotOk(db.getObject(missingTableName));
    });

    it('handles explicit public schema name in path', function () {
      assert.isOk(db.getObject(`public.${tableName}`));
    });
  });

  describe('other schema', function () {
    const schemaTableName = `${schema}.${tableName}`;
    const missingSchemaTableName = `${schema}.${missingTableName}`;

    before(function* () {
      yield db.createSchema(schema);
      yield db.createDocumentTable(schemaTableName);
    });

    after(function* () {
      yield db.dropTable(schemaTableName, {cascade: true});
      yield db.dropSchema(schema, {cascade: true});
    });

    it('verifies the presence of the table in the specified schema', function () {
      assert.isOk(db.getObject(schemaTableName));
      assert.isNotOk(db.getObject(missingSchemaTableName));
    });
  });
});
