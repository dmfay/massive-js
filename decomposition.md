# Resultset Decomposition

Views, scripts, and functions can return results from multiple tables. These complex resultsets often contain duplicate information if a `JOIN` is involved. For example, a query which joins `users` with the `tests` each has begun will return as many rows _per user_ as each user has tests. These redundancies can be difficult to work with in code.

The `decompose` option can be used to transform complex resultsets into a more friendly form. In the users-tests example, this would take the shape of an array of users, where each user has an array of tests. In order to accomplish the transformation, you have to provide a _schema_ as the option value. This schema is a JavaScript object with a few specific properties:

* `pk` (for "primary key") specifies the field in the resultset which uniquely identifies the entity represented by this schema. Decomposition currently only supports unary primary keys and does not work with compound keys.
* `columns` is either a map of fields in the resultset (keys) to fields in the output entity (values), or an array of field names if they do not need to be transformed.
* `array` is only usable on schemas nested at least one level deep. If `true`, the entities this schema represents are considered a collection instead of a nested object.

Any other key on a schema is taken to represent a nested schema, and nested schemas **may not be named** with one of the reserved keys.

Note also that pks and columns must be unique in your query's results, which is important if your query includes tables with shared column names. Ensure that any duplicate column names are aliased in your `SELECT` list.

The following schema:

```javascript
db.user_tests.find({}, {
  decompose: {
    pk: 'user_id',
    columns: ['user_id', 'username'],
    tests: {
      pk: 'test_id',
      columns: {
        test_id: 'id',
        name: 'name'
      },
      array: true
    }
  }
}).then(...)
```

will transform this recordset:

```javascript
[
  {user_id: 1, username: 'alice', test_id: 1, name: 'first'},
  {user_id: 1, username: 'alice', test_id: 2, name: 'second'},
  {user_id: 2, username: 'bob', test_id: 3, name: 'third'},
]
```

into this:

```javascript
[{
  user_id: 1,
  username: 'alice',
  tests: [{
    id: 1,
    name: 'first'
  }, {
    id: 2,
    name: 'second'
  }]
}, {
  user_id: 2,
  username: 'bob',
  tests: [{
    id: 3,
    name: 'third'
  }]
}]
```

This can also be used with raw SQL through `db.query`. Note that options need to be passed as the third argument, as the second argument is used for params.

```javascript
db.query(
  `select u.id as u_id, u.name as u_name, u.address as u_address,
    t.id as t_id, t.score as t_score
    from users u
    inner join tests t on t.user_id = u.id`,
  [],
  {
    decompose: {
      pk: 'id',
      columns: {
        u_id: 'id',
        u_name: 'name',
        u_address: 'address'
      },
      tests: {
        pk: 't_id',
        columns: {t_id: 'id', t_score: 'score'},
        array: true
      }
    }
  }
).then(...)
```

The `decompose` option can be applied to any result set, although it will generally be most useful with views and scripts.
