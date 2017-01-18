var _ = require('underscore')._;
var util = require("util");

function literalizeArray(arr) {
  if (!_.isArray(arr)) { return arr; }

  return util.format('{%s}', arr.map(function (v) {
    if (v.search(/[,{}]/) !== -1) { return util.format('"%s"', v); }

    return v;
  }).join(','));
}

exports = module.exports = {
  // basic comparison
  '=': {operator: '='},
  '!': {operator: '<>'},
  '>': {operator: '>'},
  '<': {operator: '<'},
  '>=': {operator: '>='},
  '<=': {operator: '<='},
  '!=': {operator: '<>'},
  '<>': {operator: '<>'},
  // array
  '@>': {operator: '@>', mutator: literalizeArray},
  '<@': {operator: '<@', mutator: literalizeArray},
  '&&': {operator: '&&', mutator: literalizeArray},
  '?|': {operator: '?|', mutator: literalizeArray},
  '?&': {operator: '?&', mutator: literalizeArray},
  // pattern matching
  '~~': {operator: 'LIKE'},
  'like': {operator: 'LIKE'},
  '!~~': {operator: 'NOT LIKE'},
  'not like': {operator: 'NOT LIKE'},
  '~~*': {operator: 'ILIKE'},
  'ilike': {operator: 'ILIKE'},
  '!~~*': {operator: 'NOT ILIKE'},
  'not ilike': {operator: 'NOT ILIKE'},
  'similar to': {operator: 'SIMILAR TO'},
  'not similar to': {operator: 'NOT SIMILAR TO'},
  // regex
  '~': {operator: '~'},
  '!~': {operator: '!~'},
  '~*': {operator: '~*'},
  '!~*': {operator: '!~*'},
  // distinct
  'is distinct from': {operator: 'IS DISTINCT FROM'},
  'is not distinct from': {operator: 'IS NOT DISTINCT FROM'}
};
