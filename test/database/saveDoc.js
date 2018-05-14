'use strict';

describe('saveDoc', function () {
  let db;

  before(function () {
    return resetDb('empty').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  describe('with an existing table', function () {
    before(function () {
      return db.createDocumentTable('docs');
    });

    it('saves a new document without an id', function () {
      return db.saveDoc('docs', {
        title: 'Alone',
        description: 'yearning in the darkness',
        price: 89.99,
        is_good: true,
        created_at: '2015-03-04T09:43:41.643Z'
      }).then(doc => {
        assert.equal(doc.title, 'Alone');
        assert.equal(doc.id, 1);
        assert.isOk(doc.created_at);
        assert.notOk(doc.updated_at);
      });
    });

    it('updates an existing document with an id', function* () {
      const doc = yield db.saveDoc('docs', {
        title: 'Alone',
        description: 'yearning in the darkness',
        price: 89.99,
        is_good: true,
        created_at: '2015-03-04T09:43:41.643Z'
      });

      assert.equal(doc.title, 'Alone');
      assert.isOk(doc.id);
      assert.isOk(doc.created_at);
      assert.notOk(doc.updated_at);

      doc.title = 'Together!';

      const updated = yield db.saveDoc('docs', doc);

      assert.equal(updated.id, doc.id);
      assert.equal(updated.title, 'Together!');
      assert.isOk(updated.created_at);
      assert.isOk(updated.updated_at);

      const retrieved = yield db.docs.findDoc(doc.id);

      assert.equal(retrieved.title, 'Together!');
    });

    it('pulls metadata off the actual jsonb field', function* () {
      let doc = yield db.saveDoc('docs', {
        one: 1
      });

      assert.isOk(doc.id);
      assert.isOk(doc.created_at);
      assert.notOk(doc.updated_at);
      assert.equal(doc.one, 1);

      doc.two = 2;

      doc = yield db.saveDoc('docs', doc);

      assert.isOk(doc.id);
      assert.isOk(doc.created_at);
      assert.isOk(doc.updated_at);
      assert.equal(doc.one, 1);
      assert.equal(doc.two, 2);

      const row = yield db.docs.findOne(doc.id);

      assert.isOk(row);
      assert.deepEqual(row.body, {one: 1, two: 2});
    });
  });

  describe('with an existing table in a schema', function () {
    before(function* () {
      yield db.createSchema('myschema');

      return db.createDocumentTable('myschema.docs');
    });

    it('saves a new document without an id', function () {
      return db.saveDoc('myschema.docs', {
        title: 'Alone',
        description: 'yearning in the darkness',
        price: 89.99,
        is_good: true,
        created_at: '2015-03-04T09:43:41.643Z'
      }).then(doc => {
        assert.equal(doc.title, 'Alone');
        assert.equal(doc.id, 1);
      });
    });

    it('updates an existing document with an id', function* () {
      const doc = yield db.saveDoc('myschema.docs', {
        title: 'Alone',
        description: 'yearning in the darkness',
        price: 89.99,
        is_good: true,
        created_at: '2015-03-04T09:43:41.643Z'
      });

      assert.isOk(db.myschema);
      assert.equal(doc.title, 'Alone');
      assert.isOk(doc.id);

      doc.title = 'Together!';

      const updated = yield db.saveDoc('myschema.docs', doc);

      assert.equal(updated.id, doc.id);
      assert.equal(updated.title, 'Together!');

      const retrieved = yield db.myschema.docs.findDoc(doc.id);

      assert.equal(retrieved.title, 'Together!');
    });

    after(function () {
      return db.dropSchema('myschema', {cascade: true});
    });
  });

  describe('without an existing table', function () {
    it('creates a table if none exists', function* () {
      const doc = yield db.saveDoc('doggies', {name: 'Fido', age: 10});

      assert.isOk(db.doggies);
      assert.equal(doc.name, 'Fido');
    });

    after(function () {
      return db.query('DROP TABLE doggies;');
    });
  });

  describe('without an existing table in a schema', function () {
    before(function () {
      return db.createSchema('myschema');
    });

    it('creates a table if none exists', function* () {
      const doc = yield db.saveDoc('myschema.doggies', {name: 'Fido', age: 10});

      assert.isOk(db.doggies);
      assert.equal(doc.name, 'Fido');
    });

    after(function () {
      return db.dropSchema('myschema', {cascade: true});
    });
  });
});
