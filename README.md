# Massive.js 3.0: A Postgres-centric Data Access Tool

[![Build Status](https://travis-ci.org/dmfay/massive-js.svg?branch=master)](https://travis-ci.org/dmfay/massive-js)

Massive.js is a data mapper for Node.js that goes all in on PostgreSQL and fully embraces the power and flexibility of the SQL language and relational metaphors. Providing minimal abstractions for the interfaces and tools you already use, its goal is to do just enough to make working with your data as easy and intuitive as possible, then get out of your way.

Massive is _not_ an object-relational mapper (ORM)! It doesn't use models, it doesn't track state, and it doesn't limit you to a single entity-based metaphor for accessing and persisting data. You've already got a data model: your schema. Massive introspects your database at runtime and returns a connected instance with your tables, views, functions, and scripts attached and ready to query, write, or execute.

Here are some of the high points:

* **Dynamic query generation**: Massive features a versatile query builder with support for a wide variety of operators, all generated from a simple criteria object.
* **Do as much, or as little, as you need**: if you're coming from an ORM background, you might be expecting to have to create or load an entity instance before you can write it to the database. You don't. As long as you don't run afoul of `NOT NULL` constraints, you can emit inserts and updates which affect only the columns you actually need to write and make up the data on the spot.
* **Document storage**: PostgreSQL's JSONB storage type makes it possible to blend relational and document strategies. Massive offers a robust API to simplify working with documents: objects in, objects out, with document metadata managed for you.
* **Postgres everything**: committing to a single RDBMS allows us to leverage it to the fullest extent possible. Massive supports array fields, JSON storage, pattern matching with regular expressions, and many, many more features found in PostgreSQL but not in other databases.

## Full Documentation

[Full documentation including API docs is available on GitHub Pages.](https://dmfay.github.io/massive-js/)

## Table of Contents

<!-- vim-markdown-toc GFM -->
* [Installation](#installation)
* [Quickstart](#quickstart)
  * [Raw SQL](#raw-sql)
  * [Tables and Views](#tables-and-views)
    * [Schemas](#schemas)
    * [Criteria Objects](#criteria-objects)
    * [Query Options](#query-options)
    * [Querying](#querying)
    * [Persisting](#persisting)
    * [Documents](#documents)
    * [Deleting](#deleting)
  * [Functions and Scripts](#functions-and-scripts)
  * [Streams](#streams)
  * [Accessing the Driver](#accessing-the-driver)
* [REPL](#repl)
* [Older Versions](#older-versions)
* [Contributing](#contributing)

<!-- vim-markdown-toc -->

## Installation

```
npm i massive --save
```

**Starting with version 3, Massive uses Promises exclusively. If you need a callback-based API, download version 2.x from [the Releases page](https://github.com/dmfay/massive-js/releases).**

Examples are presented using the standard `then()` construction for compatibility, but use of ES2017 `async` and `await` or a flow control library such as [co](https://github.com/tj/co) to manage promises is highly recommended.

## Quickstart

Once installed, `require` the library and connect to your database with a parameter object or connection string:

```javascript
const massive = require('massive');

massive({
  host: '127.0.0.1',
  port: 5432,
  database: 'appdb',
  user: 'appuser',
  password: 'apppwd'
}).then(db => {...});
```

When you instantiate Massive, it introspects your database for tables, views, and functions. Along with files in your scripts directory (`/db` by default), these become an API that allows you to query database objects and execute scripts and functions. This initialization process is fast, but not instantaneous, and you don't want to be doing it every time you run a new query. Massive is designed to be initialized once, with the instance retained and used throughout the rest of your application. In Express, you can store it with `app.set` in your entry point and retrieve it with `req.app.get` in your routes; with koa, using `app.context`. If no such mechanism is available, you can take advantage of Node's module caching to require the object as necessary.

### Raw SQL

Need to get weird? Massive offers a lot of features for interacting with your database objects in abstract terms which makes bridging the JavaScript-Postgres divide much easier and more convenient, but sometimes there's no way around handcrafting a query. If you need a prepared statement, consider using the scripts directory (see below) but if it's a one-off, there's always `db.run`.

```javascript
db.run('select * from tests where id > $1', [1]).then(tests => {
  // all tests matching the criteria
});
```

`run` takes named parameters as well:

```javascript
db.run('select * from tests where id > ${something}', {something: 1}).then(tests => {
  // all tests matching the criteria
});
```

### Tables and Views

Massive loads all views (including materialized views), all tables having primary key constraints, and foreign tables (which cannot have primary keys). Unlike object/relational mappers, Massive does not traverse relationships or build model trees. Limited support for mapping complex result objects is a potential future consideration, but if you need to correlate data from multiple tables using a view is recommended.

#### Schemas

Massive understands database schemas and treats any schema other than the default `public` as a namespace. Objects bound to the `public` schema are attached directly to the database object, while other schemas will be represented by a namespace attached to the database object, with their respective tables and views bound to the namespace.

```javascript
// query a table on the public schema
db.tests.find(...).then(...);

// query a table on the auth schema
db.auth.users.find(...).then(...);
```

#### Criteria Objects

Many functions use criteria objects to build a query WHERE clause. A criteria object is a JavaScript map matching database fields to values. Unless otherwise specified in the field name, the predicate operation is assumed to be equality. Massive's query builder is extremely flexible and accommodates both standard and Postgres-specific predicates, including JSON object traversal and array and regexp operations.

```javascript
{
  'field': 'value',               // equality
  'field <>': 'value',            // inequality
  'field': [1, 2, 3],             // IN (x, y, z) tests
  'field >': 1,                   // greater than
  'field <=': 1,                  // less than or equal
  'field BETWEEN': [1, 100],      // BETWEEN
  'field LIKE': 'val%',           // LIKE
  'field NOT ILIKE': 'Val%',      // NOT LIKE (case-insensitive)
  'field ~': 'val[ue]+',          // regexp match
  'field !~*': 'Val[ue]+',        // no regexp match (case-insensitive)
  'field @>': ['value', 'Value'], // array contains
  'field ->> attr': 'value'       // JSON traversal
}
```

There are many more; see the full documentation for the complete list.

#### Query Options

The finder functions -- `find`, `findOne`, `findDoc`, `search`, and `searchDoc` -- allow usage of an options object as the second argument. Like the criteria object, this is an ordinary JavaScript map; however, the field names are fixed. Any field may be omitted if not needed.

```javascript
{
  build: true,                    // return query text and parameters without executing anything
  document: true,                 // query is against a document table (see below)
  order: 'id desc',               // creates an ORDER BY clause to enforce sorting
  orderBody: true,                // force order to apply to fields in a document body instead of the table fields
  offset: 20,                     // adds an OFFSET to skip the first n rows
  limit: 10,                      // adds a LIMIT to restrict the number of rows returned
  single: true,                   // force returning the first result object instead of a results array
  stream: true,                   // return results as a readable stream (see below)
  only: true                      // restrict the query to the target table, ignoring descendant tables
}
```

#### Querying

**findOne** finds a single object with a primary key or a criteria object.

```javascript
db.tests.findOne(1).then(test1 => {
  // the test with ID 1
});

db.tests.findOne({
  is_active: true,
  'version >': 1,
  'name ilike': 'home%'
}).then(tests => {
  // the first active test with a higher version and a name matching ILIKE criteria
});
```

`find` is a general-purpose query function which returns a result list.

```javascript
db.tests.find({
  is_active: true,
  'version >': 1,
  'name ilike': 'home%'
}, {
  columns: ['name', 'version'],
  order: 'created_at desc',
  offset: 20,
  limit: 10
}).then(tests => {
  // all active tests with higher versions and a name matching ILIKE criteria
  // options are not required; these set the select list and results ordering, offset, and limit
});
```

`count` returns the resultset length.

```javascript
db.tests.count({
  is_active: true,
  'version >': 1,
  'name ilike': 'home%'
}).then(count => {
  // 
});
```

`search` performs full-text searches.

```javascript
db.tests.search({
  fields: ["name"],
  term: "home"}
).then(tests => {
  // all tests with 'home' in the name
});
```

`where` allows you to write your own WHERE clause instead of using a criteria object.

```javascript
db.tests.where('is_active = $1 AND version > $2', [true, 1]).then(tests => {
  // all active tests with higher versions
});
```

#### Persisting

`save` performs an upsert, inserting if the object has no primary key value and updating if it does. `save` can only be used with local tables, since foreign tables do not have primary keys to test.

```javascript
db.tests.save({
  version: 1,
  name: 'homepage'
}).then(tests => {
  // an array containing the newly-inserted test
});

db.tests.save({
  id: 1,
  version: 2,
  priority: 'high'
}).then(tests => {
  // an array containing the updated test; note that the name will not have changed!
});
```

`insert` creates a new row or rows (if passed an array).

```javascript
db.tests.insert({
  name: 'homepage',
  version: 1
}).then(tests => {
  // an array containing the newly-inserted test
});

db.tests.insert([{
  name: 'homepage',
  version: 1
}, {
  name: 'about us',
  version: 1
}]).then(tests => {
  // an array containing both newly-inserted tests
});
```

`update` has two variants. Passed an object with a value for the table's primary key field, it updates all included fields of the object based on the primary key; or, passed a criteria object and a changes map, it applies all changes to all rows matching the criteria. Only the latter variant can be used with foreign tables.

```javascript
db.tests.update({
  id: 1,
  version: 2,
  priority: 'high'
}).then(tests => {
  // an array containing the updated test
});

db.tests.update({
  priority: 'high'
}, {
  priority: 'moderate'
}).then(tests => {
  // an array containing all tests which formerly had priority 'high'
  // since this issues a prepared statement note that the version field cannot be incremented here!
});
```

#### Documents

Postgres' JSONB functionality allows for a more free-form approach to data than relational databases otherwise support. Working with JSONB fields is certainly possible with the suite of standard table functions, but Massive also allows the dynamic creation and usage of dedicated document tables with a separate set of functions.

Document tables consist of some metadata, including the primary key, and a `body` JSONB field. A GIN index is also created for the document body and a full-text search vector to speed up queries. When querying a document table, the primary key is added to the `body`; when persisting, it is pulled off and used to locate the record.

`saveDoc` writes a document to the database. It may be invoked from the database object itself in order to create the table on the fly.

```javascript
db.saveDoc('reports', {
  title: 'Week 12 Throughput',
  lines: [{
    name: '1 East',
    numbers: [5, 4, 6, 6, 4]
  }, {
    name: '2 East',
    numbers: [4, 4, 4, 3, 7]
  }]
}).then(report => {
  // the reports table has been created and the initial document is assigned a primary key value and returned
});
```

If the document table already exists, `saveDoc` can be invoked on it just as the standard table functions are. This function performs an insert if no `id` is provided, or an update otherwise. The entire document will be added or modified; for partial changes, use `modify`.

```javascript
db.reports.saveDoc({
  id: 1,  // omit in order to insert
  title: 'Week 12 Throughput',
  lines: [{
    name: '1 East',
    numbers: [5, 4, 6, 6, 4]
  }, {
    name: '2 East',
    numbers: [4, 4, 4, 3, 7]
  }]
}).then(report => {
  // the newly created report
});
```

`modify` adds and updates fields in an existing document (or any JSON/JSONB column) _without_ replacing the entire body. Fields not defined in the `changes` object are not modified.

```javascript
db.reports.modify(1, {
  title: 'Week 11 Throughput'
}).then(report => {
  // the updated report, with a changed 'title' attribute
});

db.products.modify(1, {
  colors: ['gray', 'purple', 'red']
}, 'info').then(widget => {
  // the product with an 'info' field containing the colors array
});
```

Much of the standard queryable API has corresponding functionality with document tables. Document query functions only use criteria objects and (in the case of `findDoc`) primary key values. Simple criteria objects, testing equality only, can leverage the GIN index on the document table for improved performance.

```javascript
db.reports.countDoc({
  'title ilike': '%throughput%'
}).then(count => {
  // number of matching documents
});

db.reports.findDoc(1).then(report => {
  // the report document body with the primary key included
});

db.reports.findDoc({
  'title ilike': '%throughput%'
}).then(reports => {
  // all report documents matching the criteria
});

db.reports.searchDoc({
  fields : ["title", "description"],
  term : "Kauai"
}.then(docs => {
  // reports returned with an on-the-fly full text search for 'Kauai'
});
```

#### Deleting

There's only one function to delete data: `destroy`, which takes a criteria object. To destroy a document, use the primary key or specify JSON traversal operations in the criteria object.

```javascript
db.tests.destroy({
  priority: 'high'
}).then(tests => {
  // an array containing all removed tests
});
```

### Functions and Scripts

Object-relational mappers tend to ignore functions. For many, the database exists solely as a repository, with data manipulation reserved for application logic and external jobs.

To be fair, this setup is perfectly sufficient for many use cases. But when it isn't, it _hurts_. With functions, you can perform complex operations on your data at a scope and speed unrivaled by anything else. Why go to the trouble of querying bulk data into another system and manipulating it -- only to put it back where it was with a second trip across the wire? Especially when there's a powerful, flexible language purpose-built for set operations _right there_? You wouldn't work that way, and Massive won't make you: functions are first-class citizens as far as it's concerned.

Massive actually loads functions from two locations: the database itself, and a /db directory in your project root which contains prepared statements in .sql script files (the location may be changed by passing a `scripts` parameter on initialization). Subdirectories in /db are, like schemas, treated as namespaces; although, unlike schemas, they may be nested.

Functions and scripts are loaded onto the database object and can be invoked directly:

```javascript
db.uuid_generate_v1mc().then(arr => {
  // an array containing the generated UUID (requires the uuid-ossp extension)
});

db.myTestQueries.restartTests([5, true]).then(results => {
  // this runs the prepared statement in db/myTestQueries/restartTests.sql with the above parameters and returns any output from a RETURNING clause
});
```

Like `run`, prepared statements in script files can use named parameters instead of `$1`-style indexed parameters. Named parameters are formatted `${name}`. Other delimiters besides braces are supported; consult the pg-promise documentation for a full accounting.

```javascript
db.myTestQueries.restartTests({category: 5, force: true}).then(results => {
  // as above; the prepared statement should use ${category} and ${force} instead of $1 and $2.
});
```

### Streams

To improve performance with large result sets, you might want to consider using a stream instead of getting your results in an array all at once. This has the upside of returning _something_ to read right away (which can be a big deal for slow queries too!), but the price is that the connection remains open until you're done. To turn on streaming, add `{stream: true}` to your options object.

```js
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

### Accessing the Driver

Massive is focused on convenience and simplicity, not completeness. There will always be features we don't cover; that's why there's `db.run` for arbitrary queries. In the same vein, Massive exposes the [pg-promise](https://github.com/vitaly-t/pg-promise) driver as `db.driver` so client code can easily use its lower-level functions when necessary.

## REPL

Massive.js ships with a REPL (read-evaluate-print loop), an interactive console that lets you connect to a database and execute JavaScript code. The easiest way to run it is to install globally:

```
npm i -g massive
```

You can then fire up a connection and start writing JavaScript:

```
massive -d appdb

db > db.tables.map(table => table.name);
[ 'tests',
  'users' ]

db > db.tests.find({priority: 'low'}).then(...);
```

In addition to the `tables` collection, the `views` and `functions` collections are also exposed on the database object.

When invoking functions, you may omit the `then` if you just want to see output -- Massive provides a resolver which logs the results to make it easy to query with the REPL.

Exit the REPL by pressing Ctrl-C twice.

## Older Versions

Release versions are tagged and available [here](https://github.com/dmfay/massive-js/releases).

Documentation for Massive.js 2.x is at [readthedocs](http://massive-js.readthedocs.org/en/latest/).

## Contributing

Issues and especially pull requests are welcome! If you've found a bug, please include a minimal code sample I can use to hunt the problem down.

To run the tests, first create an empty `massive` database. The `postgres` superuser should have `trust` authentication enabled for local socket connections.

```
createdb massive
```

Run the tests with npm:

```
npm test
```
