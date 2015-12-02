var _ = require('underscore')._;
var util = require("util");

function literalizeArray(arr) {
  if (!_.isArray(arr)) { return arr; }

  return util.format('{%s}', arr.map(function (v) {
    if (v.search(/[,{}]/) !== -1) { return util.format('"%s"', v); }

    return v;
  }).join(','));
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
