'use strict';

describe('where', function () {
  let db;

  before(function() {
    return resetDb().then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('returns Product 1 OR Product 2', function () {
    return db.products.where('id=$1 OR id=$2', [1,2]).then(res => assert.lengthOf(res, 2));
  });

  it('returns Product 1 AND Product 2', function () {
    return db.products.where('id=$1 AND price=$2', [1,12.00]).then(res => assert.lengthOf(res, 1));
  });

  it('returns Product 1 with params as not array', function () {
    return db.products.where('id=$1', 1).then(res => assert.lengthOf(res, 1));
  });

  it('uses named parameters', function () {
    return db.products.where('id=${id}', {id: 1}).then(res => assert.lengthOf(res, 1));
  });
});
