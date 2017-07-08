'use strict';

describe('findDoc', function () {
  let db;

  before(function(){
    return resetDb().then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('returns results in document format', function () {
    return db.docs.findDoc().then(docs => {
      assert.lengthOf(docs, 4);
      assert.equal(docs[0].id, 1);
      assert.equal(docs[0].title, 'Document 1');
      assert.equal(docs[0].description, 'lorem ipsum etc');
    });
  });

  it('applies criteria', function () {
    return db.docs.findDoc({title: 'Document 1'}).then(docs => {
      assert.lengthOf(docs, 1);
      assert.equal(docs[0].id, 1);
      assert.equal(docs[0].title, 'Document 1');
      assert.equal(docs[0].description, 'lorem ipsum etc');
    });
  });

  it('applies options', function () {
    return db.docs.findDoc({title: 'Document 1'}, {build: true}).then(query => {
      assert.deepEqual(query, {
        sql: 'SELECT * FROM "docs"\nWHERE "body" @> $1 ORDER BY "id"',
        params: ['{"title":"Document 1"}']
      });
    });
  });
});
