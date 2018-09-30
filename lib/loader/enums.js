'use strict';

exports = module.exports = function (instance, config) {
  return instance.query(config.queryFiles['enums.sql'], config).then(enums => {
    return enums.reduce((obj, e) => {
      obj[e.name] = e.enum_value;

      return obj;
    }, {});
  });
};
