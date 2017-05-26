'use strict';

describe('searchDoc', function () {
  let db;

  before(function () {
    return resetDb().then(instance => db = instance);
  });

  it('works on single key', function () {
    return db.docs.searchDoc({
      fields: ['title'],
      term: 'Starsky'
    }).then(docs => {
      assert.lengthOf(docs, 1);
    });
  });

  it('works on multiple fields', function () {
    return db.docs.searchDoc({
      fields: ['title', 'description'],
      term: 'Starsky'
    }).then(docs => {
      assert.lengthOf(docs, 1);
    });
  });

  it('returns multiple results', function () {
    return db.docs.searchDoc({
      fields: ['title'],
      term: 'Document'
    }).then(docs => {
      assert.lengthOf(docs, 2);
    });
  });

  it('returns properly formatted documents with id etc', function () {
    return db.docs.searchDoc({
      fields: ['title', 'description'],
      term: 'Starsky'
    }).then(docs => {
      assert.equal(docs[0].title, 'Starsky and Hutch');
    });
  });

  it('returns right number of results if limit is specified', function () {
    return db.docs.searchDoc({
      fields: ['title'],
      term: 'Document'
    }, {
      limit: 1
    }).then(docs => {
      assert.lengthOf(docs, 1);
    });
  });

  it('returns right elements if offset is specified', function* () {
    const docs = yield db.docs.searchDoc({
      fields: ['title'],
      term: 'Document'
    }, {
      limit: 2
    });

    const docs2 = yield db.docs.searchDoc({
      fields: ['title'],
      term: 'Document'
    }, {
      offset: 1,
      limit: 2
    });

    assert.equal(docs[1].id, docs2[0].id);
  });

  it('returns right elements if filter is specified', function () {
    return db.docs.searchDoc({
      fields: ['title'],
      term: 'Document',
      where: {'price': 22.00}
    }).then(docs => {
      assert.lengthOf(docs, 1);
    });
  });

  it('orders by fields in the document body with criteria', function () {
    return db.docs.searchDoc({
      fields: ['title'],
      term: 'Document'
    }, {
      order: [{field: 'title', direction: 'desc', type: 'varchar'}],
      orderBody: true
    }).then(docs => {
      assert.lengthOf(docs, 2);
      assert.equal(docs[0].title, 'Another Document');
      assert.equal(docs[1].title, 'A Document');
    });
  });
});
