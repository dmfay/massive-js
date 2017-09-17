'use strict';

const _ = require('lodash');

exports = module.exports = (fields, records) => _.reduce(records, (params, r) => {
  return params.concat(fields.map(key => {
    const val = r[key];

    if (_.isArray(val) && val.length === 0) {
      return '{}';  // legacy syntax is easier than introspecting+storing types
    }

    return val;
  }));
}, []);
