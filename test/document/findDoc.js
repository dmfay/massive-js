'use strict';

describe('findDoc', function () {
  let db;

  before(function(){
    return resetDb().then(instance => db = instance);
  });

  it('returns results in document format', function () {
    return db.docs.findDoc('*').then(docs => {
      assert.lengthOf(docs, 3);
      assert.equal(docs[0].id, 1);
      assert.equal(docs[0].title, 'A Document');
      assert.equal(docs[0].description, 'lorem ipsum etc');
    });
  });
});
