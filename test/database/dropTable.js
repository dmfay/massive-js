'use strict';

describe('dropTable', function () {
  const schema = 'spec';
  const tableName = 'doggies';
  let db;

  before(function () {
    return resetDb('empty').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  describe('without schema', function () {
    before(function () {
      return db.createDocumentTable(tableName);
    });

    it('removes the table from public schema', function* () {
      assert.isOk(db[tableName]);

      yield db.dropTable(tableName, {cascade: true});

      assert.isUndefined(db[tableName]);
    });
  });

  describe('with schema', function () {
    const schemaTableName = `${schema}.${tableName}`;

    before(function* () {
      yield db.createSchema(schema);
      yield db.createDocumentTable(schemaTableName);
    });

    it('removes the table from the specified schema', function* () {
      assert.isOk(db[schema][tableName]);

      yield db.dropTable(schemaTableName, {cascade: true});

      assert.isUndefined(db[schema][tableName]);
    });
  });
});
