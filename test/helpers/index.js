const massive = require("../../index");
const connectionString = "postgres://postgres@localhost/massive";
const co = require('co');
const path = require("path");
const scriptsDir = path.join(__dirname, "..", "db");

exports.connectionString = connectionString;

exports.init = () => {
  return massive.connect({
    connectionString : connectionString,
    enhancedFunctions : true,
    scripts : scriptsDir
  });
};

exports.resetDb = co.wrap(function* (schema) {
  schema = schema || 'default';

  const db = yield this.init();

  const schemata = yield db.run("select schema_name from information_schema.schemata where catalog_name = 'massive' and schema_name not like 'pg_%' and schema_name not like 'information_schema'");

  yield Promise.all(schemata.map(schema => db.run(`drop schema ${schema.schema_name} cascade`)));

  yield db.schemata[schema]();

  return yield this.init();
});

