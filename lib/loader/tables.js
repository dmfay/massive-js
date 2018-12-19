'use strict';

exports = module.exports = function (db) {
  return db.instance.query(db.loader.queryFiles['tables.sql'], db.loader);
};
