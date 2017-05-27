'use strict';

describe('findDoc', function () {
  let db;

  before(function(){
    return resetDb().then(instance => db = instance);
  });

  it('counts documents', function () {
    return db.docs.countDoc({'title like': '_ Document'}).then(res => assert.equal(res, 1));
  });
});
