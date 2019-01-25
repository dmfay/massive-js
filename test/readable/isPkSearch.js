'use strict';

describe('isPkSearch', function () {
  let db;

  before(function () {
    return resetDb('pk-search').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('should pass integers', function () {
    assert.isTrue(db.products.isPkSearch(1));
  });

  it('should pass v1 uuids', function () {
    assert.isTrue(db.products.isPkSearch('a432c1f6-0443-11e6-b512-3e1d05defe78'));
  });

  it('should pass v4 uuids', function () {
    assert.isTrue(db.products.isPkSearch('a2a072cc-7a41-4fd6-bd16-ae1677166c05'));
  });

  it('should pass stringified integers', function () {
    assert.isTrue(db.products.isPkSearch('1'));
  });

  it('should reject badly versioned uuids', function () {
    assert.isFalse(db.products.isPkSearch('a2a072cc-7a41-9fd6-bd16-ae1677166c05'));
  });

  it('should reject badly formatted uuids', function () {
    assert.isFalse(db.products.isPkSearch('a2a072cc7a419fd6bd16ae1677166c05'));
  });

  it('should accept simple document criteria', function () {
    assert.isTrue(db.products.isPkSearch({id: 1}));
  });

  it('should accept complex document criteria', function () {
    assert.isTrue(db.products.isPkSearch({'id >=': 1}));
  });

  it('should never be true for views', function () {
    assert.isFalse(db.popular_products.isPkSearch({'id >=': 1}));
  });
});
