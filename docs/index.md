---
title: Index - MassiveJS
permalink: /
---

## Get Started

```
npm install massive --save
```

**Starting with version 3, Massive uses Promises exclusively. If you need a callback-based API, download version 2.x from [the Releases page](https://github.com/dmfay/massive-js/releases).**

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
