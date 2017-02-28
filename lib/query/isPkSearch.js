'use strict';

const _ = require('lodash');
const isUuid = new RegExp(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

exports = module.exports = function(conditions, options) {
  if (_.isNumber(conditions) || (_.isString(conditions) && isUuid.test(conditions))) {
    // primitive value
    return true;
  }

  const keys = _.keys(conditions);

  if (options.document && keys.length === 1 && /^id[^\w\d]?/.test(keys[0])) {
    return true;
  }

  return false;
};
