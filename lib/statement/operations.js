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
  // comparison predicates
  'is': {operator: 'IS', mutator: mutators.buildIs},
  'is not': {operator: 'IS NOT', mutator: mutators.buildIs},
  'is distinct from': {operator: 'IS DISTINCT FROM'},
  'is not distinct from': {operator: 'IS NOT DISTINCT FROM'}
};

/**
 * Get an operation definition.
 *
 * @param {String} key - An operation key.
 * @default Equality
 * @return {Object} An operation definition, cloned for safety.
 */
exports = module.exports = key => {
  return _.clone(map[key]);
};
