'use strict';

const _ = require('lodash');
const parseKey = require('../util/parse-key');

/**
 * Generate an ORDER BY clause from an array of order segments.
 *
 * @param {Array} order - The sort definition.
 * @param {String} order.field A column name which will be safely quoted, OR
 * @param {String} order.expr A raw expression, which will NOT be quoted (this will be vulnerable to SQL injection if user input is interpolated). Exprs ignore useBody.
 * @param {String} [order.type] A cast type to be applied before ordering.
 * @param {String} [order.direction] "asc" (the default) or "desc".
 * @param {Boolean} [useBody] - If true and using the Array form of order,
 * will generate order based on a document body.
 * @return {String} An ORDER BY clause.
 */
exports = module.exports = (order, useBody) => {
  if (!order) { return ''; }

  return 'ORDER BY ' + _.reduce(order, function (acc, val) {
    const direction = val.direction && val.direction.toLowerCase() === 'desc' ? 'desc' : 'asc';
    let field;

    if (val.expr) {
      field = val.expr;
    } else if (useBody) {
      field = `body->>'${val.field}'`;
    } else if (val.field) {
      const parsed = parseKey(val.field, () => {});

      field = parsed.field;
    }

    if (val.type) {
      acc.push(`(${field})::${val.type} ${direction}`);
    } else {
      acc.push(`${field} ${direction}`);
    }

    return acc;
  }, []).join(',');
};
