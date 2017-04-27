'use strict';

describe('saveDoc', function () {
  let db;

  before(function* () {
    db = yield resetDb('empty');
    yield db.createSchema('public');
  });

  describe('with an existing table', function () {
    before(function() {
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

      doc.title = 'Together!';

      const updated = yield db.saveDoc('docs', doc);

      assert.equal(updated.id, doc.id);
      assert.equal(updated.title, 'Together!');

      const retrieved = yield db.docs.findDoc(doc.id);

      assert.equal(retrieved.title, 'Together!');
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

    after(function() {
      return db.dropSchema('myschema', {cascade: true});
    });
  });

  describe('without an existing table', function () {
    it('creates a table if none exists', function* () {
      const doc = yield db.saveDoc('doggies', {name: 'Fido', age: 10});

      assert.isOk(db.doggies);
      assert.equal(doc.name, 'Fido');
    });

    after(function() {
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

    after(function() {
      return db.dropSchema('myschema', {cascade: true});
    });
  });

  describe('with a validator', function () {
    before(function() {
      return db.createDocumentTable('doggies');
    });

    it('applies validation to a document', function* () {
      db.getTable('doggies').validate = function(doc) {
        if (!doc.name) throw 'Dogs must have a name';
      };

      var doc;
      try {
        doc = yield db.saveDoc('doggies', {age: 10});
        assert(false)
      } catch (err) {
        // this is in fact OK
      }

      doc = yield db.saveDoc('doggies', {name: 'Fido', age: 10});

      assert.isOk(db.doggies);
    });

    after(function() {
      return db.query('DROP TABLE doggies;');
    });
  });
});
