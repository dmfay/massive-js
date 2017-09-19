'use strict';

const _ = require('lodash');

exports = module.exports = (fields, records) => _.reduce(records, (params, r) => {
  return params.concat(fields.map(key => {
    const val = r[key];

    return val;
  }));
}, []);
