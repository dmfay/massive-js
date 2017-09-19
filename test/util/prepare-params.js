'use strict';

const prepareParams = require('../../lib/util/prepare-params');

describe('prepareParams', function () {
  it('returns a parameter array with values for each field', function () {
    const params = prepareParams(['one', 'two', 'three'], [{one: 1, two: 2}, {two: 3, three: 4}]);

    assert.deepEqual(params, [1, 2, undefined, undefined, 3, 4]);
  });
});
