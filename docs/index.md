# Get Started

```
npm install massive --save
```

**Starting with version 3.0.0, Massive requires ES6 support and uses Promises exclusively. If you need a callback-based API or are using a pre-6.x release of Node.js, install massive@2 or download version 2.x from [the Releases page](https://github.com/dmfay/massive-js/releases).**

Examples are presented using the standard `then()` construction for compatibility, but use of ES2017 `async` and `await` or a flow control library such as [co](https://github.com/tj/co) to manage promises is highly recommended.

## REPL

Massive ships with an interactive Read-Evaluate-Print Loop or REPL which lets you connect to a database and query it using JavaScript.

If you have Massive installed globally with the `-g` flag, you can simply `massive`; if you've installed it in a project, `./node_modules/.bin/massive`. Pass `--database mydb` to connect to a local database, or `--connection` to use a connection string.

## Changing the Promise Library

Massive uses ES6 promises by default. To use a different promise implementation such as Bluebird to enable long stack traces, pass the `required` promise module in the driver options.

```javascript
const promise = require('bluebird');

massive(connectionInfo, {}, {
  promiseLib: promise
}).then(instance => {...});
```

## Monitoring Queries

`pg-monitor` can help diagnose bugs and performance issues by logging all queries Massive emits to the database as they happen in realtime with more granularity than `tail`ing the Postgres logfile. Note that while the driver options are not required while initializing Massive, `db.driverConfig` still contains the read-only `pg-promise` configuration.

```javascript
const massive = require('massive');
const monitor = require('pg-monitor');

massive('postgres://localhost:5432/massive').then(db => {
  monitor.attach(db.driverConfig);

  db.query('select 1').then(data => {
    // monitor output appears in the console
  });
});
```

## Streaming Results

To improve performance with large result sets, you might want to consider using a stream instead of getting your results in an array all at once. This has the upside of returning _something_ to read right away (which can be a big deal for slow queries too!), but the price is that the connection remains open until you're done. To turn on streaming, add `{stream: true}` to your options object.

```javascript
db.tests.find({priority: 'low'}, {stream: true}).then(stream => {
  const tests = [];

  stream.on('readable', () => {
    tests.push(stream.read());
  });

  stream.on('end', () => {
    // do something with tests here
  });
});
```
