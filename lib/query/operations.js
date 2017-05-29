'use strict';

const _ = require('lodash');
const traversers = new RegExp(/[-#]>>/);

/**
 * Transform an array into a safe comma-delimited string literal.
 */
const literalizeArray = condition => {
  if (_.isArray(condition.value)) {
    const sanitizedValues = condition.value.map(function (v) {
      if (v.search(/[,{}]/) !== -1) { return `"${v}"`; }

      return v;
    });

    condition.params.push(`{${sanitizedValues.join(',')}}` );
  } else {
    condition.params.push(condition.value);
  }

  condition.value = `$${condition.offset}`;

  return condition;
};

/**
 * Build an IN (x, y, z) predicate.
 */
const buildIn = function (condition) {
  condition.operation.operator = condition.operation.operator === '=' ? 'IN' : 'NOT IN';

  const inList = _.reduce(condition.value, (list, v) => {
    condition.params.push(v);

    return list.concat([`$${condition.offset++}`]);
  }, []);

  condition.value = `(${inList.join(', ')})`;

  return condition;
};

/**
 * Build a BETWEEN (a, b) predicate.
 */
const buildBetween = condition => {
  condition.params = condition.value;
  condition.value = `$${condition.offset} AND $${++condition.offset}`;

  return condition;
};

/**
 * Interpolate nulls directly into a predicate.
 */
const interpolateNull = function (condition) {
  condition.operation.operator = condition.operation.operator === '=' ? 'IS' : 'IS NOT';

  condition.value = 'null';

  return condition;
};

/**
 * Handle the overloads for equality tests: interpolating null and building IN
 * lists.
 */
const equality = function (condition) {
  if (condition.value === null) { return interpolateNull(condition); }
  else if (_.isArray(condition.value)) { return buildIn(condition); }
  else {
    condition.params.push(condition.value);

    condition.value = `$${condition.offset}`;

    return condition;
  }
};

/**
 * Operation definitions for parsing criteria objects.
 *
 * Keys are search strings in criteria keys. Values define an output SQL
 * operator and an optional mutator which will be applied to the appropriate
 * parameter value for the prepared statement.
 *
 * @enum
 * @readonly
 */
const map = {
  // basic comparison
  '=': {operator: '=', mutator: equality},
  '!': {operator: '<>', mutator: equality},
  '>': {operator: '>'},
  '<': {operator: '<'},
  '>=': {operator: '>='},
  '<=': {operator: '<='},
  '!=': {operator: '<>', mutator: equality},
  '<>': {operator: '<>', mutator: equality},
  'between': {operator: 'BETWEEN', mutator: buildBetween},
  // array
  '@>': {operator: '@>', mutator: literalizeArray},
  '<@': {operator: '<@', mutator: literalizeArray},
  '&&': {operator: '&&', mutator: literalizeArray},
  // pattern matching
  '~~': {operator: 'LIKE'},
  'like': {operator: 'LIKE'},
  '!~~': {operator: 'NOT LIKE'},
  'not like': {operator: 'NOT LIKE'},
  '~~*': {operator: 'ILIKE'},
  'ilike': {operator: 'ILIKE'},
  '!~~*': {operator: 'NOT ILIKE'},
  'not ilike': {operator: 'NOT ILIKE'},
  // regex
  'similar to': {operator: 'SIMILAR TO'},
  'not similar to': {operator: 'NOT SIMILAR TO'},
  '~': {operator: '~'},
  '!~': {operator: '!~'},
  '~*': {operator: '~*'},
  '!~*': {operator: '!~*'},
  // distinct
  'is distinct from': {operator: 'IS DISTINCT FROM'},
  'is not distinct from': {operator: 'IS NOT DISTINCT FROM'}
};

exports = module.exports = map;
exports.traversers = traversers;

exports.buildIn = buildIn;

/**
 * Find the operation specified in a predicate key.
 *
 * @param {String} str - A predicate key from a criteria object.
 * @return Operation info.
 * @default Equality
 */
exports.get = (str) => {
  str = str.toLowerCase().replace(traversers, '');  // remove JSON pathing and make case consistent

  let op = _.reduce(map, function (found, val, key) {
    // if we matched something (eg '!' for 'not equal') previously and now have
    // matched a longer operator (eg '!~~' for 'not like'), the more specific
    // operator is the correct one.
    if (str.indexOf(key) > -1 && val.operator.length > found.key.length) {
      // save the operation key as originally entered for splitting -- we
      // don't want to be looking for '<>' when the user gave us '!='.
      return _.assign(_.clone(val), { key: key });
    }

    return found;
  }, {key: ''});

  if (op.key == '') { op = _.clone(map['=']); }

  return op;
};

