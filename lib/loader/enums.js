'use strict';

exports = module.exports = function (db) {
  return db.instance.query(db.loader.queryFiles['enums.sql'], db.loader).then(enums => {
    return enums.reduce((obj, e) => {
      obj[e.name] = e.enum_value;

      return obj;
    }, {});
  });
};
