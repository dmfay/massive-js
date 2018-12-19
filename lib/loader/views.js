'use strict';

exports = module.exports = function (db) {
  const file = db.loader.excludeMatViews ? 'views-legacy.sql' : 'views.sql';

  return db.instance.query(db.loader.queryFiles[file], db.loader);
};
