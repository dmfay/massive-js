'use strict';

exports = module.exports = function (instance, config) {
  const file = config.excludeMatViews ? 'views-legacy.sql' : 'views.sql';

  return instance.query(config.queryFiles[file], config);
};
