'use strict';

describe('countDoc', function () {
  let db;

  before(function () {
    return resetDb('data-docs').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('counts documents', function () {
    return db.docs.countDoc({'title like': 'Document _'}).then(res => assert.equal(res, 3));
  });

  it('counts all documents', function () {
    return db.docs.countDoc().then(res => assert.equal(res, 4));
  });
});
