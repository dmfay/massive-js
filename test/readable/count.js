'use strict';

describe('count', function () {
  let db;

  before(function () {
    return resetDb('singletable').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  describe('where syntax', function () {
    it('returns 2 for OR id 1 or 2', function () {
      return db.products.count('id=$1 OR id=$2', [1, 2]).then(res => assert.equal(res, 2));
    });

    it('returns 1 for id 1', function () {
      return db.products.count('id=$1', [1]).then(res => assert.equal(res, 1));
    });
  });

  describe('find syntax', function () {
    it('returns 2 for OR id 1 or 2', function () {
      return db.products.count({id: [1, 2]}).then(res => assert.equal(res, 2));
    });

    it('returns 1 for id 1', function () {
      return db.products.count({id: 1}).then(res => assert.equal(res, 1));
    });

    it('returns 4 for everything', function () {
      return db.products.count({}).then(res => assert.equal(res, 4));
    });
  });
});
