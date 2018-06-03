# Options

The options object modifies query behavior, either by applying additional clauses to the query itself or by changing how Massive handles results.

Options can be passed to most query and persistence functions as the final argument.

```javascript
db.tests.find({
  is_active: true
}, {
  fields: ['name', 'started_at'],
  exprs: {
    lowername: 'lower(name)',
    total: 'passes + failures'
  },
  offset: 20,
  limit: 10,
  only: true,
  stream: true
}).then(stream => {
  // a stream returning the name, start date, lower-
  // cased name, and pass + failure total for active
  // tests 21-30, omitting rows from any descendant
  // tables
});
```

<!-- vim-markdown-toc GFM -->

* [Filtering and Shaping Results](#filtering-and-shaping-results)
  * [Ordering Results](#ordering-results)
* [Results Processing](#results-processing)
* [Tasks and Transactions](#tasks-and-transactions)

<!-- vim-markdown-toc -->

## Filtering and Shaping Results

Certain SQL clauses are used with different types of query. For example, a `LIMIT` clause can only be used with a function which emits a `SELECT` such as `find` or `count`.

| Option key       | Use in            | Description |
|------------------|-------------------|-------------|
| fields           | `find*`, `search` | Specify an array of column names to include in the resultset. The names will be quoted; use `exprs` to invoke functions or operate on columns. |
| exprs            | `find*`, `search` | Specify a map of aliases to expressions to include in the resultset. **Do not send user input directly into `exprs` unless you understand the risk of SQL injection!** |
| limit            | `find*`, `search` | Set the number of rows to take. |
| offset           | `find*`, `search` | Set the number of rows to skip. |
| only             | any               | Set to `true` to restrict the query to the table specified, if any others inherit from it. |
| order            | `find*`, `search` | An array of [order objects](#ordering-results). |
| onConflictIgnore | `insert`          | If the inserted data would violate a unique constraint, do nothing. |
| deepInsert       | `insert`          | Specify `true` to turn on [deep insert](persistence#deep-insert). |
| body             | `updateDoc`       | Specify in order to override the default `body` field affected by `updateDoc`. |

**nb. The `exprs` option and the corresponding `expr` key in order objects interpolate values into the emitted SQL. Take care with raw strings and ensure that user input is never directly passed in through the options, or you risk opening yourself up to SQL injection attacks.**

### Ordering Results

The `order` option sets an array of order objects which are used to build a SQL `ORDER BY` clause. An order object must contain a `field` or an `expr`; all other properties are optional.

* `field`: The name of the column being sorted on. May be a JSON path if sorting by an element nested in a JSON field or document table body.
* `expr`: A raw SQL expression. Will not be escaped or quoted and **is potentially vulnerable to SQL injection**.
* `direction`: The sort direction, `ASC` or `DESC`.
* `type`: Define a cast type for values. Useful with JSON fields.

```javascript
db.tests.find({
  is_active: true
}, {
  order: [{
    field: 'started_at',
    direction: 'desc'
  }, {
    expr: 'passes + failures',
    direction: 'asc'
  }]
}).then(stream => {
  // all tests, ordered first by most recent start
  // date, then by pass + failure total beginning
  // with the lowest
});
```

## Results Processing

Results processing options are generally applicable to all query types, although `stream` is principally useful with query functions.

| Option key | Description |
|------------|-------------|
| build      | Set to `true` to return the query text and parameters *without* executing anything. |
| document   | Set to `true` to invoke [document table handling](documents). |
| single     | Set to `true` to return the first result as an object instead of a results array. |
| stream     | Set to `true` to return results as a stream instead of an array. Streamed results cannot be `decompose`d. |
| decompose  | Provide a schema to [transform the results into an object graph](decomposition). Not compatible with `stream`. |

## Tasks and Transactions

`db.withConnection` may take a single option:

| Option key | Description |
|------------|-------------|
| tag        | A tag which will be visible in [pg-monitor](index#monitoring-queries). |

`db.withTransaction` as well:

| Option key | Description |
|------------|-------------|
| mode       | A [TransactionMode](https://vitaly-t.github.io/pg-promise/txMode.TransactionMode.html) object defining a new isolation level, readonly mode, and/or deferrable mode. |
