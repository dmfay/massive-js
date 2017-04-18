'use strict';

const singleValue = require('../../lib/util/single-value');
const AssertionError = require('assert').AssertionError;

describe('singleValue', function () {
  it('returns the value of a single-key map', function () {
    assert.equal(singleValue({field: 'value'}), 'value');
  });

  it('raises an error if the map does not contain one and only one field', function () {
    assert.throws(() => singleValue({}), AssertionError);
    assert.throws(() => singleValue({field: 'value', otherfield: 'othervalue'}), AssertionError);
  });
});
