'use strict';

const _ = require('lodash');
const Massive = require('./lib/massive');
const configFields = ['pgFormatting', 'pgNative', 'promiseLib', 'noLocking', 'capSQL', 'noWarnings', 'connect', 'disconnect', 'query', 'receive', 'task', 'transact', 'error', 'extend'];
const connectionFields = ['connectionString', 'db', 'database', 'host', 'port', 'user', 'password', 'ssl', 'binary', 'client_encoding', 'application_name', 'fallback_application_name', 'poolSize'];

exports = module.exports = config => {
  let connection = _.pick(config, connectionFields);
  let conf = _.pick(config, configFields);

  if (Object.keys(connection).length === 1 && (!!connection.database || !!connection.db)) {
    connection = `postgres://localhost:5432/${connection.database || connection.db}`;
  }

  return (new Massive(config, connection)).reload();
};

