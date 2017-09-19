'use strict';

const _ = require('lodash');

/**
 * Assembles a parameter list for a prepared statement from a list of records
 * being inserted or updated. Parameter list generation for WHERE clauses in
 * all statements is handled in {@linkcode module:where}.
 *
 * @module util/prepareParams
 * @param {Array} fields - A list of fields to pick from each record.
 * @param {Array} records - A list of records.
 * @return {Array} An array containing the values of each key from each record,
 * or undefined if the record does not contain the key.
 */
exports = module.exports = (fields, records) => _.reduce(records, (params, r) => {
  return params.concat(fields.map(key => {
    const val = r[key];

    return val;
  }));
}, []);
