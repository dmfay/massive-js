---
title: Index - MassiveJS
permalink: /
---

# Get Started

```
npm install massive --save
```

**Starting with version 3, Massive requires ES6 support and uses Promises exclusively. If you need a callback-based API or are using a pre-6.x release of Node.js, download version 2.x from [the Releases page](https://github.com/dmfay/massive-js/releases).**

Examples are presented using the standard `then()` construction for compatibility, but use of ES2017 `async` and `await` or a flow control library such as [co](https://github.com/tj/co) to manage promises is highly recommended.

## Express Example

```
const express = require('express');
const http = require('http');
const massive = require('massive');

const app = express();

massive({
  host: '127.0.0.1',
  port: 5432,
  database: 'appdb',
  user: 'appuser',
  password: 'apppwd'
}).then(instance => {
  app.set('db', instance);

  app.get('/', (req, res) => {
    req.app.get('db').feed_items.find({
      'rating >': 0
    }, {
      order: 'created_at desc'
    }).then(items => {
      res.json(items);
    });
  });

  http.createServer(app).listen(3000);
});
```

## Driver Configuration

Direct configuration of the pg-promise driver is supported by passing an initialization options object as the third argument when connecting Massive.

```javascript
massive(connectionInfo, {}, {
  pgNative: true,
  capSQL: true
}).then(instance => {
  // driver options cannot be modified but are available
  // as db.driverConfig
});
```

For a full accounting of options please see the [pg-promise documentation](https://github.com/vitaly-t/pg-promise#initialization-options). Some especially useful configurations are listed below.

### Changing the Promise Library

Massive uses ES6 promises by default. To use a different promise implementation such as Bluebird to enable long stack traces, pass the `required` promise module in the driver options.

```javascript
const promise = require('bluebird');

massive(connectionInfo, {}, {
  promiseLib: promise
}).then(instance => {...});
```

### Monitoring Queries

`pg-monitor` can help diagnose bugs and performance issues by showing all queries Massive emits to the database as they happen in realtime. Note that while the driver options are not required while initializing Massive, `db.driverConfig` still contains the read-only `pg-promise` configuration.

```javascript
const massive = require('massive');
const monitor = require('pg-monitor');

massive('postgres://localhost:5432/massive').then(db => {
  monitor.attach(db.driverConfig);

  db.run('select 1').then(data => {
    // monitor output appears in the console
  });
});
```

### Streaming Results

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
