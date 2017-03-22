'use strict';

const _ = require('lodash');
const Database = require('./lib/database');

exports = module.exports = (config, connection) => {
  if (!connection || _.isEmpty(connection)) {
    return Promise.reject('No connection information specified.');
  } else if (Object.keys(connection).length === 1 && (!!connection.database || !!connection.db)) {
    connection = `postgres://localhost:5432/${connection.database || connection.db}`;
  }

  return (new Database(config, connection)).reload();
};

