'use strict';

const _ = require('lodash');

exports = module.exports = (order, useBody) => {
  if (_.isArray(order)) {
    return ' ORDER BY ' + _.reduce(order, function (acc, val) {
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
    return ` ORDER BY ${order}`;
  }

  return '';
};
