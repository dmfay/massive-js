'use strict';

const getFilterString = require('../../lib/util/get-filter-string');

describe('getFilterString', function () {
  it('allows all entities', function () {
    assert.equal(getFilterString(), '');
    assert.equal(getFilterString(null), '');
  });

  it('returns string filters', function () {
    assert.equal(getFilterString('one'), 'one');
    assert.equal(getFilterString('one, two'), 'one, two');
  });

  it('joins array filters', function () {
    assert.equal(getFilterString(['one']), 'one');
    assert.equal(getFilterString(['one', 'two']), 'one, two');
  });

  it('throws on invalid input', function () {
    assert.throws(() => getFilterString({}));
  });
});
