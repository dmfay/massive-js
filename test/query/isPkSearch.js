'use strict';

const isPkSearch = require('../../lib/query/isPkSearch');

describe('isPkSearch', function () {
  it('should pass integers', function () {
    assert.equal(isPkSearch(1, {}), true);
  });

  it('should pass v1 uuids', function () {
    assert.equal(isPkSearch('a432c1f6-0443-11e6-b512-3e1d05defe78', {}), true);
  });

  it('should pass v4 uuids', function () {
    assert.equal(isPkSearch('a2a072cc-7a41-4fd6-bd16-ae1677166c05', {}), true);
  });

  it('should reject integers in strings', function () {
    assert.equal(isPkSearch('1', {}), false);
  });

  it('should reject badly versioned uuids', function () {
    assert.equal(isPkSearch('a2a072cc-7a41-9fd6-bd16-ae1677166c05', {}), false);
  });

  it('should reject badly formatted uuids', function () {
    assert.equal(isPkSearch('a2a072cc7a419fd6bd16ae1677166c05', {}), false);
  });

  it('should accept simple document criteria', function () {
    assert.equal(isPkSearch({id: 1}, {document: true}), true);
  });

  it('should accept complex document criteria', function () {
    assert.equal(isPkSearch({'id >=': 1}, {document: true}), true);
  });

  it('should reject objects if not looking at a document', function () {
    assert.equal(isPkSearch({id: 1}, {}), false);
  });
});
