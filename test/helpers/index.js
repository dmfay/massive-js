'use strict';

const co = require('co');
const path = require('path');
const connectionString = 'postgres://postgres@localhost/massive';
const scriptsDir = path.join(__dirname, 'scripts');

require('co-mocha');

global._ = require('lodash');
global.assert = require('chai').use(require('chai-as-promised')).assert;
global.massive = require('../../index');
global.connectionString = connectionString;

global.resetDb = co.wrap(function* (schema) {
  schema = schema || 'default';

  const db = yield massive(connectionString, {
    enhancedFunctions: true,
    scripts: scriptsDir
  }, {
    noWarnings: true
  });

  const schemata = yield db.run("select schema_name from information_schema.schemata where catalog_name = 'massive' and schema_name not like 'pg_%' and schema_name not like 'information_schema'");

  yield Promise.all(schemata.map(schema => db.run(`drop schema ${schema.schema_name} cascade`)));

  yield db.schemata[schema]();

  return yield db.reload();
});

