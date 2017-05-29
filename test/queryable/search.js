'use strict';

describe('search', function () {
  let db;

  before(function() {
    return resetDb().then(instance => db = instance);
  });

  it('returns 4 products for term \'product\'', function () {
    return db.products.search({fields: ['name'], term: 'Product'}).then(res => {
      assert.lengthOf(res, 4);
    });
  });
  it('returns 1 products for term \'3\'', function () {
    return db.products.search({fields: ['name'], term: '3'}).then(res => {
      assert.lengthOf(res, 1);
    });
  });
  it('returns 1 Users for term \'test\'', function () {
    return db.Users.search({fields: ['Name'], term: 'test'}).then(res => {
      assert.lengthOf(res, 1);
    });
  });
  it('returns 4 products for term \'description\' using multiple fields', function () {
    return db.products.search({fields: ['Name', 'description'], term: 'description'}).then(res => {
      assert.lengthOf(res, 4);
    });
  });
  it('returns 0 products for term \'none\' using multiple fields', function () {
    return db.products.search({fields: ['Name', 'description'], term: 'none'}).then(res => {
      assert.lengthOf(res, 0);
    });
  });
  it('returns 2 products for term \'description\' using multiple fields when limit is set to 2', function () {
    return db.products.search({fields: ['Name', 'description'], term: 'description'}, {limit: 2}).then(res => {
      assert.lengthOf(res, 2);
    });
  });
  it('returns same correct element when offset is set', function* () {
    const one = yield db.products.search({fields: ['Name', 'description'], term: 'description'});
    const two = yield db.products.search({fields: ['Name', 'description'], term: 'description'}, {offset: 1});

    assert.equal(one[1].id, two[0].id);
  });
  it('returns results filtered by where', function () {
    return db.docs.search({fields: ['body->>\'description\''], term: 'C:*', where: {'body->>is_good': 'true'}}).then(res => {
      assert.lengthOf(res, 1);
    });
  });
});
