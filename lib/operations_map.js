var _ = require('underscore')._;
var util = require("util");

function literalizeArray(arr) {
  if (!_.isArray(arr)) { return arr; }

  return util.format('{%s}', arr.join(','));
}

module.exports = {
  '=': {operator: '='},
  '!': {operator: '!='},
  '>': {operator: '>'},
  '<': {operator: '<'},
  '>=': {operator: '>='},
  '<=': {operator: '<='},
  '!=': {operator: '<>'},
  '<>': {operator: '<>'},
  '@>': {operator: '@>', mutator: literalizeArray},
  '<@': {operator: '<@', mutator: literalizeArray},
  '&&': {operator: '&&', mutator: literalizeArray}
};
