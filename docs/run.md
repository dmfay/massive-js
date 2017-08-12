# Raw SQL

Massive offers a lot of features for interacting with your database objects in abstract terms which makes bridging the JavaScript-Postgres divide much easier and more convenient, but sometimes there's no way around handcrafting a query. If you need a prepared statement, consider using the scripts directory (see below) but if it's a one-off, there's always `db.run`.

```javascript
db.run('select * from tests where id > $1', [1]).then(tests => {
  // all tests matching the criteria
});
```

`run` takes named parameters as well:

```javascript
db.run(
  'select * from tests where id > ${something}',
  {something: 1}
).then(tests => {
  // all tests matching the criteria
});
```

# Transactions

A function can be run inside a transaction, rolling back if an exception is thrown and committing on successful completion. If specified, a tag allows easier monitoring through `pg-monitor`.

```javascript
db.transaction('an optional tag', function () {
  return Promise.all([
    db.users.insert({username: 'alice'}),
    db.tests.insert({name: 'homepage', version: 1})
  ]);
});
```

It is possible to override the default transaction mode. See the [pg-promise TransactionMode docs](https://vitaly-t.github.io/pg-promise/txMode.TransactionMode.html) for full documentation:

```javascript
const TransactionMode = db.pgp.txMode.TransactionMode;
const isolationLevel = db.pgp.txMode.isolationLevel;

db.transaction(function () {
  return Promise.all([
    db.users.insert({username: 'alice'}),
    db.tests.insert({name: 'homepage', version: 1})
  ]);
}, new TransactionMode({
  tiLevel: isolationLevel.serializable,
  readOnly: true,
  deferrable: false
}));
```
