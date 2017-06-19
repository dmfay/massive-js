'use strict';

describe('findDoc', function () {
  let db;

  before(function(){
    return resetDb().then(instance => db = instance);
  });

  it('returns results in document format', function () {
    return db.docs.findDoc().then(docs => {
      assert.lengthOf(docs, 4);
      assert.equal(docs[0].id, 1);
      assert.equal(docs[0].title, 'A Document');
      assert.equal(docs[0].description, 'lorem ipsum etc');
    });
  });

  it('applies criteria', function () {
    return db.docs.findDoc({title: 'A Document'}).then(docs => {
      assert.lengthOf(docs, 1);
      assert.equal(docs[0].id, 1);
      assert.equal(docs[0].title, 'A Document');
      assert.equal(docs[0].description, 'lorem ipsum etc');
    });
  });

  it('applies options', function () {
    return db.docs.findDoc({title: 'A Document'}, {build: true}).then(query => {
      assert.deepEqual(query, {
        sql: 'SELECT * FROM "docs"\nWHERE "body" @> $1 ORDER BY "id"',
        params: ['{"title":"A Document"}']
      });
    });
  });
});
