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

  let db = yield this.init();

  let schemata = yield new Promise((resolve, reject) => {
    db.run("select schema_name from information_schema.schemata where catalog_name = 'massive' and schema_name not like 'pg_%' and schema_name not like 'information_schema'", function (err, schemata) {
      if (err) { return reject(err); }

      return resolve(schemata);
    });
  });

  yield Promise.all(schemata.map(schema =>
    new Promise((resolve, reject) =>
      db.run(`drop schema ${schema.schema_name} cascade`, err => {
        if (err) { return reject(err); }

        return resolve();
      })
    )
  ));

  yield new Promise((resolve, reject) =>
    db.schemata[schema](err => {
      if (err) { return reject(err); }
      return resolve();
    })
  );

  return yield this.init();
});

