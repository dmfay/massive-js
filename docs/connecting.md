## Connecting

```js
var massive = require('massive');

massive.connect({
  connectionString: 'postgres://postgres@localhost/massive',
  defaults: {
    poolSize: 20
  },
  enhancedFunctions: true
}, function (err, db) {
  // db contains your tables, views, and functions
})
```

The `connect` options *must* include either a `connectionString` or a `db`
property giving the name of a database on localhost to connect to.

The connect options may also include a `defaults` property, which is passed to
the underlying node-postgres driver to set options such as `poolSize` or
`parseInt8`. For more complete documentation of available driver defaults, see
the [node-postgres](https://github.com/brianc/node-postgres/wiki/pg#pgdefaults)
documentation.

`enhancedFunctions` is an experimental setting that allows functions to return
a value matching their return type rather than a set of rows, see
[Function Invocation](functions.md#function-invocation).
