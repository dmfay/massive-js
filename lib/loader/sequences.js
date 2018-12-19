'use strict';

exports = module.exports = function (db) {
  return db.instance.query(db.loader.queryFiles['sequences.sql'], db.loader);
};
