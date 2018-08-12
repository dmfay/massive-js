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
  * [Keyset Pagination](#keyset-pagination)
* [Persisting Data](#persisting-data)
* [Table Inheritance](#table-inheritance)
* [Results Processing](#results-processing)
* [Tasks and Transactions](#tasks-and-transactions)

<!-- vim-markdown-toc -->

## Filtering and Shaping Results

These options affect data retrieval queries. Some, such as `fields` and `exprs`, are generally applicable to all such calls; others, such as `limit` and `pageLength`, are only useful when multiple records will be returned.

| Option key       | Description |
|------------------|-------------|
| fields           | Specify an array of column names to include in the resultset. The names will be quoted; use `exprs` to invoke functions or operate on columns. |
| exprs            | Specify a map of aliases to expressions to include in the resultset. **Do not send user input directly into `exprs` unless you understand the risk of SQL injection!** |
| limit            | Set the number of rows to take. |
| offset           | Set the number of rows to skip. |
| order            | An array of [order objects](#ordering-results). |
| pageLength       | Number of results to return with [keyset pagination](#keyset-pagination). Requires `order`. |

**nb. The `exprs` option and the corresponding `expr` key in order objects interpolate values into the emitted SQL. Take care with raw strings and ensure that user input is never directly passed in through the options, or you risk opening yourself up to SQL injection attacks.**

### Ordering Results

The `order` option sets an array of order objects which are used to build a SQL `ORDER BY` clause. An order object must contain a `field` or an `expr`; all other properties are optional.

* `field`: The name of the column being sorted on. May be a JSON path if sorting by an element nested in a JSON field or document table body.
* `expr`: A raw SQL expression. Will not be escaped or quoted and **is potentially vulnerable to SQL injection**.
* `direction`: The sort direction, `ASC` (default) or `DESC`.
* `type`: Define a cast type for values. Useful with JSON fields.
* `last`: If using [keyset pagination](#keyset-pagination), this attribute's value from the final record on the previous page.

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

### Keyset Pagination

When query results are meant to be displayed to a user, it's often useful to retrieve and display them one page at a time. This is easily accomplished by setting `limit` to the page length and `offset` to the page length times the current page (counting from zero). However, as result sets grow larger, this method starts to perform poorly as the first _n_ rows must be retrieved and discarded each time.

Keyset pagination offers a trade: consistent performance, but you don't know how many pages there are. It does require a slightly different user interface metaphor which avoids numbering and jumping to arbitrary pages, but the performance gains can be worth it. For a detailed technical breakdown, see [Markus Winand's post on the topic](https://use-the-index-luke.com/sql/partial-results/fetch-next-page).

Although enabling keyset pagination is a matter of a single field, it does require some setup:

* You may _not_ specify `offset` or `limit`. Massive will return a rejected promise if you do.
* You _must_ have an `order` array. Massive will return a rejected promise if you do not. Create an index on your `order` columns for further read performance benefits!
* The `order` array must guarantee deterministic ordering of records; the easiest way to ensure this is to sort on the primary key or a unique column last. Failure may result in records appearing on multiple pages or apparently missing records.
* The `order` array must use consistent directionality: if one attribute is being sorted in descending order, all attributes must be sorted in descending order. Inconsistent directionality means inconsistent results.

Once these prerequisites are satisfied, set the `pageLength` option to the number of records you want back per page.

**To retrieve subsequent pages**, inspect the last record on the current page. When you make the query for the next page, add a `last` key to each element of the `order` array containing that attribute's value for the final record.

```js
db.issues.find(
  {},
  {
    order: [{
      field: 'test_id',
      last: 1500
    }, {
      field: 'issue_id',
      last: 10256
    }],
    pageLength: 25
  }
).then(next25Results => ...);
```

## Persisting Data

These options modify data persistence calls.

| Option key       | Use in            | Description |
|------------------|-------------------|-------------|
| onConflictIgnore | `insert`          | If the inserted data would violate a unique constraint, do nothing. |
| deepInsert       | `insert`          | Specify `true` to turn on [deep insert](persistence#deep-insert). |
| body             | `updateDoc`       | Specify in order to override the default `body` field affected by `updateDoc`. |

## Table Inheritance

By default, queries against tables having descendant tables affect and/or return records from those descendant tables. Use the `only` option to prevent this, but it's superfluous if the target has no descendant tables.

| Option key       | Use in            | Description |
|------------------|-------------------|-------------|
| only             | any               | Set to `true` to restrict the query to the table specified, if any others inherit from it. |

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
