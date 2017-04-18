'use strict';

const _ = require('lodash');
const assert = require('assert');

exports = module.exports = obj => {
  const values = _.values(obj);

  assert(values.length === 1);

  return values[0];
};
