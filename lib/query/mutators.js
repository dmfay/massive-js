'use strict';

/** @module mutators */

const _ = require('lodash');

/**
 * Build a BETWEEN (a, b) predicate.
 */
exports.buildBetween = condition => {
  condition.params = condition.value;
  condition.value = `$${condition.offset++} AND $${condition.offset++}`;

  return condition;
};

/**
 * Build an IN (x, y, z) predicate.
 */
exports.buildIn = condition => {
  condition.operation.operator = condition.operation.operator === '=' ? 'IN' : 'NOT IN';

  const inList = _.reduce(condition.value, (list, v) => {
    condition.params.push(v);

    return list.concat([`$${condition.offset++}`]);
  }, []);

  condition.value = `(${inList.join(',')})`;

  return condition;
};

/**
 * Interpolate values into a predicate with IS/IS NOT.
 */
exports.buildIs = function (condition) {
  condition.operation.operator = condition.operation.operator === '=' ? 'IS' : 'IS NOT';

  return condition;
};

/**
 * Handle the overloads for equality tests: interpolating null and boolean
 * values and building IN lists.
 */
exports.equality = function (condition) {
  if (condition.value === null || _.isBoolean(condition.value)) { return exports.buildIs(condition); }
  else if (_.isArray(condition.value)) { return exports.buildIn(condition); }
  else {
    condition.params.push(condition.value);

    condition.value = `$${condition.offset}`;

    return condition;
  }
};

/**
 * Transform an array into a safe comma-delimited string literal.
 */
exports.literalizeArray = condition => {
  if (_.isArray(condition.value)) {
    const sanitizedValues = condition.value.map(function (v) {
      if (_.isString(v) && (v === '' || v === 'null' || v.search(/[,{}\s\\"]/) !== -1)) {
        return `"${v.replace(/([\\"])/g, '\\$1')}"`;
      } else if (v === null) {
        return 'null';
      }

      return v;
    });

    condition.params.push(`{${sanitizedValues.join(',')}}` );
  } else {
    condition.params.push(condition.value);
  }

  condition.value = `$${condition.offset}`;

  return condition;
};
