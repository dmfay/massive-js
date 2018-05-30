# Framework Examples

Need a copy&paste cookbook for initializing Massive with your web framework or context? Look no further!

If you're using Massive with a framework not already here, [feel free to submit a pull request with your own example](https://github.com/dmfay/massive-js/blob/master/CONTRIBUTING.md#pull-requests).

<!-- vim-markdown-toc GFM -->

* [Koa](#koa)
* [Express](#express)
* [Synchronous Wrapped Connection](#synchronous-wrapped-connection)
  * [db.js](#dbjs)
  * [index.js](#indexjs)

<!-- vim-markdown-toc -->

## Koa

```
const Koa = require('koa');
const Router = require('koa-router');
const massive = require('massive');

const app = new Koa();
const router = new Router();

massive({
  host: '127.0.0.1',
  port: 5432,
  database: 'appdb',
  user: 'appuser',
  password: 'apppwd'
}).then(instance => {
  app.context.db = instance;

  router.get('/', async (ctx) => {
    ctx.body = await ctx.db.feed_items.find({
      'rating >': 0
    }, {
      order: [{field: 'created_at', direction: 'desc'}]
    });
  });

  app
    .use(router.routes())
    .use(router.allowedMethods())
    .listen(3000);
});
```

## Express

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
      order: [{field: 'created_at', direction: 'desc'}]
    }).then(items => {
      res.json(items);
    });
  });

  http.createServer(app).listen(3000);
});
```

## Synchronous Wrapped Connection

If you need to be able to acquire an already-connected connected instance synchronously without a central `app` or similar object, you can wrap connection in your own module and `require` it where you need it.

### db.js

If you've already connected once (which _is_ an asynchronous process and must be `await`ed or similar), the instance is cached so future invocations resolve synchronously.

```javascript
const massive = require('massive');

let db;

exports = module.exports = function () {
  if (db) {
    return db;
  }

  return massive({
    host: '127.0.0.1',
    port: 5432,
    database: 'appdb',
    user: 'appuser',
    password: 'apppwd'
  }).then(instance => {
    db = instance;

    return Promise.resolve(db);
  });
};
```

### index.js

```javascript
const getDb = require('./db');

getDb().then(db => {
  console.log(db.listTables());

  // don't pass the instance
  return Promise.resolve();
}).then(() => {
  // retrieve the already-connected instance synchronously
  const db = getDb();

  console.log(db.listTables());

  process.exit(0);
});
```
