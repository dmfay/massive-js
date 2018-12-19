'use strict';

const _ = require('lodash');

exports = module.exports = function (db) {
  if (db.loader.excludeFunctions) { return db.$p.resolve([]); }

  return db.instance.query(db.loader.queryFiles['functions.sql'], db.loader).then(fns => {
    return fns.map(fn => {
      const params = _.times(fn.paramCount, i => `$${i + 1}`).join(',');

      fn.sql = `SELECT * FROM "${fn.schema}"."${fn.name}"(${params})`;

      return fn;
    });
  });
};
