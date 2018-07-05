'use strict';

const Writable = require('../../lib/writable');

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

  describe('without schema', function () {
    after(function () {
      return db.dropTable(tableName, {cascade: true});
    });

    it('creates a table on public schema', function () {
      return db.createDocumentTable(tableName).then(() => {
        assert.isOk(db[tableName]);
        assert.instanceOf(db[tableName], Writable);
      });
    });
  });

  describe('(UUID config) without schema', function () {
    before(function () {
      return db.createExtension('uuid-ossp');
    });

    after(function () {
      global.loader.documentPkType = 'serial';
      global.loader.uuidVersion = '';

      return db.dropTable(tableName, {cascade: true})
        .then(function () {
          return db.dropExtension('uuid-ossp');
        });
    });

    it('creates a table with UUID primary key on public schema', function () {
      global.loader.documentPkType = 'uuid';
      global.loader.uuidVersion = 'uuid_generate_v1mc';

      return db.createDocumentTable(tableName).then(() => {
        assert.isOk(db[tableName]);
        assert.instanceOf(db[tableName], Writable);
      });
    });
  });

  describe('with schema', function () {
    const schemaTableName = `${schema}.${tableName}`;

    before(function () {
      return db.createSchema(schema);
    });

    after(function () {
      return db.dropSchema(schema, {cascade: true});
    });

    it('creates a table on the specified schema', function () {
      return db.createDocumentTable(schemaTableName).then(() => {
        assert.isOk(db[schema][tableName]);
        assert.instanceOf(db[schema][tableName], Writable);
      });
    });
  });

  describe('(UUID config) with schema', function () {
    const schemaTableName = `${schema}.${tableName}`;

    before(function () {
      return Promise.all([
        db.createSchema(schema), db.createExtension('uuid-ossp')
      ]);
    });

    after(function () {
      global.loader.documentPkType = 'serial';
      global.loader.uuidVersion = '';

      return db.dropSchema(schema, {cascade: true})
        .then(function () {
          return db.dropExtension('uuid-ossp');
        });
    });

    it('creates a table with UUID primary key on the specified schema', function () {
      global.loader.documentPkType = 'uuid';
      global.loader.uuidVersion = 'uuid_generate_v1mc';

      return db.createDocumentTable(schemaTableName).then(() => {
        assert.isOk(db[schema][tableName]);
        assert.instanceOf(db[schema][tableName], Writable);
      });
    });
  });
});
