#!/usr/bin/env node

/* eslint-disable no-console */

var repl = require("repl");
var massive = require("../index");
var program = require('commander');

program
  .version('0.0.1')
  .option('-d, --database', 'The local db you want to connect to ')
  .option('-c, --connection', 'The full connection string')
  .parse(process.argv);

var connectionString;
if(program.database){
  connectionString = "postgres://localhost/" + program.args[0]; //assume local user has rights
}else if(program.connection) {
  connectionString = program.args[0];
}else{
  console.log("The options to pass in are:");
  console.log(" -d or --database to connect locally to a database");
  console.log(" -c or --connection to enter the full connection string: postgres://user:password@server/tablename");
}

if (connectionString) {
  massive.connect({connectionString: connectionString}, function(err, db) {
    if (err) {
      console.log("Failed loading Massive: "+err);
      process.exit(1);
    }

    var context = repl.start({
      prompt: "db > "
    }).context;

    context.db = db;

    console.log("Massive loaded and listening");
  });
}
