'use strict';

describe('findDoc', function () {
  let db;

  before(function(){
    return resetDb().then(instance => db = instance);
  });

  it('counts documents', function () {
    return db.docs.countDoc({'title like': 'Document _'}).then(res => assert.equal(res, 3));
  });

  it('counts all documents', function () {
    return db.docs.countDoc().then(res => assert.equal(res, 4));
  });
});
