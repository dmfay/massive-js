'use strict';

/** @module operations */

const _ = require('lodash');
const mutators = require('./mutators');

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
  '=': {operator: '=', mutator: mutators.equality},
  '!': {operator: '<>', mutator: mutators.equality},
  '>': {operator: '>'},
  '<': {operator: '<'},
  '>=': {operator: '>='},
  '<=': {operator: '<='},
  '!=': {operator: '<>', mutator: mutators.equality},
  '<>': {operator: '<>', mutator: mutators.equality},
  'between': {operator: 'BETWEEN', mutator: mutators.buildBetween},
  // array
  '@>': {operator: '@>', mutator: mutators.literalizeArray},
  '<@': {operator: '<@', mutator: mutators.literalizeArray},
  '&&': {operator: '&&', mutator: mutators.literalizeArray},
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

/**
 * Find the operation specified in a predicate key.
 *
 * @param {String} str - A predicate key from a criteria object, lowercase and
 * sans JSON traversers.
 * @return Operation info.
 * @default Equality
 */
exports = module.exports = str => {
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
