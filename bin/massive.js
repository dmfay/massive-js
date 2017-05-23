#!/usr/bin/env node

/* eslint-disable no-console */

const program = require('commander');
const repl = require('repl');
const massive = require('../index');

program
  .version('0.0.1')
  .option('-d, --database', 'Quick connect with just a local database name')
  .option('-c, --connection', 'Provide a full connection string (postgres://user:password@server/db)')
  .parse(process.argv);

let connectionString;

if (program.database) {
  connectionString = `postgres://localhost/${program.args[0]}`; //assume local user has rights
} else if (program.connection) {
  connectionString = program.args[0];
} else {
  return program.help();
}

massive({connectionString: connectionString}).then(db => {
  console.log('Massive loaded and listening');

  const r = repl.start({
    prompt: 'db > ',
    eval: (cmd, ctx, f, callback) => {
      const result = eval(cmd);

      if (result && result.then) {
        return result.then(val => callback(null, val)).catch(err => callback(err));
      }

      return callback(null, result);
    }
  });

  r.context.db = db;
  r.on('exit', () => {
    process.exit(0);
  });
}).catch(err => {
  console.log(`Failed loading Massive: ${err}`);
  process.exit(1);
});
