'use strict';

const path = require('path');
const connectionString = 'postgres://postgres@localhost/massive';

require('co-mocha');

global._ = require('lodash');
global.pgp = require('pg-promise');
global.assert = require('chai').use(require('chai-as-promised')).assert;
global.massive = require('../../index');
global.connectionString = connectionString;

global.loader = {
  enhancedFunctions: true,
  createDocumentTablePkDataType: 'uuid'
};

global.resetDb = function (schema = 'default') {
  global.loader.scripts = path.join(__dirname, 'scripts', schema);

  return massive(connectionString, global.loader).then(db => {
    return db.query(`select schema_name from information_schema.schemata where catalog_name = 'massive' and schema_name not like 'pg_%' and schema_name not like 'information_schema'`)
      .then(schemata =>
        Promise.all(schemata.map(s => db.query(`drop schema ${s.schema_name} cascade`)))
      )
      .then(() => db.schema())
      .then(() => db.reload());
  });
};

module.exports = {resetDb};
