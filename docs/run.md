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
