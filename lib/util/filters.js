'use strict';

const _ = require('lodash');

exports.schema = function (allowed) {
  if ([null, undefined, "all", "*"].indexOf(allowed) > -1) { return ""; }
  else if (_.isString(allowed)) { return allowed; }
  else if (_.isArray(allowed)) { return allowed.join(", "); }

  throw new Error("Specify allowed schemata with a comma-delimited string or an array of strings");
};

exports.entity = function (allowed) {
  if (!allowed) { return ""; }
  else if (_.isString(allowed)) { return allowed; }
  else if (_.isArray(allowed)) { return allowed.join(", "); }

  throw new Error("Specify allowed entities with a comma-delimited string or an array of strings");
};
