'use strict';

const _ = require('lodash');

/**
 * Get a filter string or create one from an array of values.
 *
 * @module getFilterString
 * @param {String|Array} [allowed] - Source filter data.
 * @return {String} A comma-separated filter string.
 * @throws Argument must be an array or string.
 */
exports = module.exports = function (allowed) {
  if (!allowed) {
    return '';
  } else if (_.isString(allowed)) {
    return allowed;
  } else if (_.isArray(allowed)) {
    return allowed.join(', ');
  }

  throw new Error('Specify allowed values with a comma-delimited string or an array of strings');
};
