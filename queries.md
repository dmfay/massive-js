# Queries

Since Massive doesn't use models, data is retrieved as plain old JavaScript objects where keys correspond to column names. With the obvious exceptions of `findOne` and `count`, most query functions return arrays where each object represents a row in the resultset _even if_ there is only one result whether naturally or from a `LIMIT` clause applied by query options.

The `find`, `findOne`, and `count` functions form a consistent API for data retrieval with criteria and options. `where` offers total flexibility if you need to hand-write a `WHERE` clause for cases where criteria objects aren't sufficient (for example, testing concatenation or math on a field). `search` handles full-text search across multiple fields.

All query functions except `count` may take [options objects](/options). Valid options are those for `SELECT` statements and general results processing. One especially useful option with query functions is `stream`, which, when true, will return results as a stream instead of an array. This allows you to start reading and handling data immediately, but the connection will remain open until the stream is terminated.

## find

`find` is the workhorse of the query functions. Given criteria and options (both optional, in which case it queries the full table) it returns a Promise for a results array. If no results are found, the array will be empty.

```javascript
db.tests.find({
  is_active: true
}, {
  offset: 20,
  limit: 10
}).then(tests => {
  // active tests 21-30
});
```

## findOne

`findOne` is a convenient alias for `find` with `options.single` set. An options object may still be passed. It returns an object corresponding to the first resulting record, or `null` if no records match the criteria.

```javascript
db.tests.findOne({
  id: 1
}, {
  fields: ['name', 'is_active']
}).then(result => {
  // an object with the name and active status for test #1
});
```

You can use a primary key value instead of a criteria object with `findOne` if desired.

```javascript
db.tests.findOne(1, {
  fields: ['name', 'is_active']
}).then(result => {
  // an object with the name and active status for test #1
});
```

## count

`count` returns the number of rows matching the criteria object. Since PostgreSQL uses 64-bit integers and JavaScript's Number type only has 53 bits of precision, the result will actually come back as a String rather than a Number.

`count` does _not_ take an options object, since there are no useful options a user might set.

```javascript
db.tests.count({
  is_active: true
}).then(total => {
  // the number of active tests
});
```

`count` may also be invoked with a `where`-style prepared statement and parameters.

## where

`where` lets you write your own prepared statement-style `WHERE` clause. While the criteria object is extremely flexible, it does have limitations: it won't perform operations such as `LEFT()` or `SUBSTRING()`, it can't set up subqueries, and so forth. For those contingencies, or if you just really want to write it yourself (we don't judge), there's `where`. Like `find`, `where` always returns a results array, even if it's empty.

```javascript
db.tests.where(
  'id IN (SELECT test_id FROM user_tests WHERE user_id = $1)',
  [1]
).then(tests => {
  // all of user 1's tests
});
```

`where` can use named parameters; just pass in an object instead of an array for the function's second argument.

```javascript
db.tests.where(
  'id IN (SELECT test_id FROM user_tests WHERE user_id = ${id})',
  {id: 1}
).then(tests => {
  // all of user 1's tests
});
```

## search

`search` enables full-text searching across multiple fields. The first argument is a search plan with an array of `fields` and a `term` to search for. The function also takes a query options object as an optional second argument. `search` returns a results array.

```javascript
db.users.search(
  {fields: ['email', 'name'], term: 'rob'},
  {stream: true}
).then(stream => {
  // a readable stream of users matching the full-text
  // search condition
});
```
