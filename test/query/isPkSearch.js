'use strict';

const isPkSearch = require('../../lib/query/isPkSearch');

describe('isPkSearch', function () {
  it('should assume a default options object', function () {
    assert.isTrue(isPkSearch(1));
  });

  it('should pass integers', function () {
    assert.isTrue(isPkSearch(1, {}));
  });

  it('should pass v1 uuids', function () {
    assert.isTrue(isPkSearch('a432c1f6-0443-11e6-b512-3e1d05defe78', {}));
  });

  it('should pass v4 uuids', function () {
    assert.isTrue(isPkSearch('a2a072cc-7a41-4fd6-bd16-ae1677166c05', {}));
  });

  it('should reject integers in strings', function () {
    assert.isFalse(isPkSearch('1', {}));
  });

  it('should reject badly versioned uuids', function () {
    assert.isFalse(isPkSearch('a2a072cc-7a41-9fd6-bd16-ae1677166c05', {}));
  });

  it('should reject badly formatted uuids', function () {
    assert.isFalse(isPkSearch('a2a072cc7a419fd6bd16ae1677166c05', {}));
  });

  it('should accept simple document criteria', function () {
    assert.isTrue(isPkSearch({id: 1}, {document: true}));
  });

  it('should accept complex document criteria', function () {
    assert.isTrue(isPkSearch({'id >=': 1}, {document: true}));
  });

  it('should reject objects if not looking at a document', function () {
    assert.isFalse(isPkSearch({id: 1}, {}));
  });
});
