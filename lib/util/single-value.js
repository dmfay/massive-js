'use strict';

const _ = require('lodash');
const assert = require('assert');

/**
 * Converts a single-key object into its value.
 *
 * @param {Object} obj - A JavaScript object.
 * @return {Any} The scalar value of the object's only key.
 */
exports = module.exports = obj => {
  const values = _.values(obj);

  assert(values.length === 1, 'cannot pull single value from a multi-valued object');

  return values[0];
};
