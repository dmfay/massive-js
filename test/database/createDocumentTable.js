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
      global.loader.uuidVersion = 'v1mc';

      return db.createDocumentTable(tableName).then(() => {
        assert.isOk(db[tableName]);
        assert.instanceOf(db[tableName], Writable);
      });
    });

    it('saves new document to existing collection (table) without a UUID primary key', function () {
      return db.saveDoc(tableName, {
        title: 'Create UUID',
        created_at: '2015-03-04T09:43:41.643Z'
      }).then(doc => {
        assert.equal(doc.title, 'Create UUID');
        assert.match(doc.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, 'valid uuid format');
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
      global.loader.uuidVersion = 'v1mc';

      return db.createDocumentTable(schemaTableName).then(() => {
        assert.isOk(db[schema][tableName]);
        assert.instanceOf(db[schema][tableName], Writable);
      });
    });

    it('saves new document to existing collection (table) without a UUID primary key', function () {
      return db.saveDoc(schemaTableName, {
        title: 'Create UUID',
        created_at: '2015-03-04T09:43:41.643Z'
      }).then(doc => {
        assert.equal(doc.title, 'Create UUID');
        assert.match(doc.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, 'valid uuid format');
      });
    });
  });
});
