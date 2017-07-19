'use strict';

const _ = require('lodash');

/**
 * Generate an ORDER BY clause.
 *
 * @param {Array|String} order - An array of 'field direction' strings, or a
 * string containing all fields and directions.
 * @param {Boolean} [useBody] - If true and using the Array form of order,
 * will generate order based on a document body.
 * @return An ORDER BY clause.
 */
exports = module.exports = (order, useBody) => {
  if (_.isArray(order)) {
    return 'ORDER BY ' + _.reduce(order, function (acc, val) {
      val.direction = val.direction || 'asc';

      if (useBody) {
        val.field = `body->>'${val.field}'`;
      }

      if (val.type) {
        acc.push(`(${val.field})::${val.type} ${val.direction}`);
      } else {
        acc.push(`${val.field} ${val.direction}`);
      }

      return acc;
    }, []).join(',');
  } else if (order) {
    return `ORDER BY ${order}`;
  }

  return '';
};
