# Massive.js: A Postgres-centric Data Access Tool

[![node](https://img.shields.io/node/v/massive.svg)](https://npmjs.org/package/massive)
[![Build Status](https://travis-ci.org/dmfay/massive-js.svg?branch=master)](https://travis-ci.org/dmfay/massive-js)
[![Coverage Status](https://coveralls.io/repos/github/dmfay/massive-js/badge.svg)](https://coveralls.io/github/dmfay/massive-js)
[![Greenkeeper badge](https://badges.greenkeeper.io/dmfay/massive-js.svg)](https://greenkeeper.io/)
[![npm](https://img.shields.io/npm/dw/massive.svg)](https://npmjs.org/package/massive)

Massive.js is a data mapper for Node.js that goes all in on PostgreSQL and fully embraces the power and flexibility of the SQL language and relational metaphors. Providing minimal abstractions for the interfaces and tools you already use, its goal is to do just enough to make working with your data as easy and intuitive as possible, then get out of your way.

Massive is _not_ an object-relational mapper (ORM)! It doesn't use models, it doesn't track state, and it doesn't limit you to a single entity-based metaphor for accessing and persisting data. You've already got a data model: your schema. Massive introspects your database at runtime and returns a connected instance with your tables, views, functions, and scripts attached and ready to query, write, or execute.

Here are some of the high points:

* **Dynamic query generation**: Massive features a versatile query builder with support for a wide variety of operators, all generated from a simple criteria object.
* **Do as much, or as little, as you need**: if you're coming from an ORM background, you might be expecting to have to create or load an entity instance before you can write it to the database. You don't. Your tables are _tables_, and you can insert or update directly into them.
* **Document storage**: PostgreSQL's JSONB storage type makes it possible to blend relational and document strategies. Massive offers a robust API to simplify working with documents: objects in, objects out, with document metadata managed for you.
* **Relational awareness**: while Massive does not traverse relationships or build model graphs, [deep inserts](https://dmfay.github.io/massive-js/persistence.html#deep-insert) can create related entities and junctions transactionally, and the [`decompose` option](https://dmfay.github.io/massive-js/options.html#decomposition-schemas) allows you to map the results of complex views and scripts to nested object trees.
* **Postgres everything**: committing to a single RDBMS allows us to leverage it to the fullest extent possible. Massive supports array fields and operations, JSON storage, foreign tables, and many, many more features found in PostgreSQL but not in other databases.

## Full Documentation

[Full documentation including API docs is available on GitHub Pages.](https://dmfay.github.io/massive-js/)

## Contributing

[See CONTRIBUTING.md](https://github.com/dmfay/massive-js/blob/master/CONTRIBUTING.md).

## Table of Contents

<!-- vim-markdown-toc GFM -->
* [Installation](#installation)
* [Connecting to a Database](#connecting-to-a-database)
* [Usage](#usage)
  * [Criteria Objects](#criteria-objects)
  * [Query Options](#query-options)
  * [A Brief Example](#a-brief-example)
    * [Persistence](#persistence)
    * [Retrieval](#retrieval)
    * [Deleting](#deleting)
    * [Functions and Scripts](#functions-and-scripts)
    * [Views](#views)
    * [Arbitrary Queries](#arbitrary-queries)
    * [Documents](#documents)
  * [Accessing the Driver](#accessing-the-driver)
* [REPL](#repl)
* [Older Versions](#older-versions)

<!-- vim-markdown-toc -->

## Installation

```
npm i massive --save
```

**Starting with version 3.0.0, Massive requires ES6 support and uses Promises exclusively. If you need a callback-based API or are using a pre-6.x release of Node.js, install massive@2 or download version 2.x from [the Releases page](https://github.com/dmfay/massive-js/releases).**

Examples are presented using the standard `then()` construction for compatibility, but use of ES2017 `async` and `await` or a flow control library such as [co](https://github.com/tj/co) to manage promises is highly recommended.

## Connecting to a Database

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

When you instantiate Massive, it introspects your database to discover the objects you use to store and retrieve data. These objects become an API for your database on the connected Massive instance itself. The following classes of database object are supported:

* All tables having primary key constraints
* Foreign tables
* Views, including materialized views
* Functions

Massive understands database schemas and treats any schema other than `public` as a namespace. Objects in the `public` schema are attached directly to the connected instance, while those in other schemas will be attached in a namespace on the instance.

The introspection process is fast, but not instantaneous, and you don't want to be doing it every time you run another query. Massive is designed to be initialized once, with the instance retained and used throughout the rest of your application.  In Express, you can store the connected instance with `app.set` in your entry point and retrieve it with `req.app.get` in your routes; or with koa, using `app.context`. If no such mechanism is available, you can take advantage of Node's module caching to require the object as necessary.

If you ever need to run the introspection again, use `db.reload()` to get a promise for an up-to-date instance.

## Usage

Consult the [documentation](https://dmfay.github.io/massive-js/) for full usage instructions.

### Criteria Objects

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
  'field.arr[1].item': 'value'    // JSON traversal
}
```

There are many more; see [the full documentation](https://dmfay.github.io/massive-js/criteria.html) for the complete list.

### Query Options

Some functions, particularly the query functions (`find`, `findOne`, `findDoc`, `search`, and `searchDoc`) allow usage of an options object as the second argument. Like the criteria object, this is an ordinary JavaScript map; however, the field names are fixed. Any field may be omitted if not needed. The options object may be omitted entirely if not needed.

```javascript
{
  build: true,                    // return query text and parameters without executing anything
  document: true,                 // treat table as a document store (see 'Documents')
  fields: ['name', 'created_at']  // retrieve only the specified fields (can be used with exprs)
  exprs: {                        // retrieve the specified expressions (can be used with fields)
    lowername: 'lower(name)'
  }
  order: [{                       // creates an ORDER BY clause to enforce sorting
    field: 'settings.role',       // JSON fields use . and [] notation
    direction: 'desc',            // set the sort direction with 'desc' or 'asc' (optional)
    type: 'int'                   // enforce a cast type (optional)
  }, {
    field: 'name'                 // order elements are applied in order
  }],
  orderBody: true,                // order applies to document body fields instead of table columns
  offset: 20,                     // adds an OFFSET to skip the first n rows
  limit: 10,                      // adds a LIMIT to restrict the number of rows returned
  single: true,                   // return the first result row as an object instead of all rows
  stream: true,                   // return results as a readable stream (see below)
  only: true                      // ignore tables inheriting from the target table
}
```

Complete documentation for query options is available [here](https://dmfay.github.io/massive-js/options.html).

### A Brief Example

Let's say we have a database for a software testing application. This database contains a `tests` table and an `issues` table, where one test may have many issues. In a separate `auth` schema, it contains a `users` table referenced by the others to represent a user running a test and discovering issues. There is a `test_stats` view which calculates statistics on aggregate issue information for individual tests, and a `user_tests` view which returns all users with their associated tests; and there is a `copy_tests` function which clones a test for reuse.

Our testing application can leverage the API Massive builds for almost everything it needs to do, but there is one feature that we haven't been able to integrate as a database function yet: the ability to, in one call, clear a test's issues and update its status to signify that it has been restarted. Eventually, we'll get there, but for now it's a SQL script in our application's `/db` directory, `resetTest.sql`.

#### Persistence

After we initialize and connect Massive, all these entities are available on the instance. First, we need to create a user:

```javascript
db.auth.users.insert({
  username: 'alice',
  password: 'supersecure'
}).then(alice => {...});
```

`alice` is a JavaScript object containing the username and password we specified. But our `users` table has more columns than that: first and foremost, there's a primary key, an `id` column, which uniquely identifies this user record. A user also has a `role`, a `created_at` timestamp defaulting to the current date on insert, and an `updated_at` timestamp to track when the record was last modified. So in addition to the fields we provided, `alice` has an `id`, a `role`, a `created_at`, and an `updated_at`. Since we didn't specify values for `role` or `updated_at`, these are `null`.

When Alice resets her password, we issue an `update`:

```javascript
db.auth.users.update({
  id: 1,
  password: 'evenmoresecure'
}).then(alice => {...});
```

The `update` will search by the primary key in the object and modify only those fields we include. Since Alice's username isn't changing, we don't need to include that in the object we're passing. However, it won't hurt anything if we do, so we could have simply modified the original `alice` object and passed that in instead.

`alice` still doesn't have a role, however, and we may have added more users without roles as well. Let's perform a bulk update to ensure that users have a minimal level of access:

```javascript
db.auth.users.update({
  'role is': null
}, {
  role: 'tester'
}).then(users => {...});
```

Now that `alice` exists in the system and has the correct role, she can start a test. When working with tests, however, we'd rather be a little more efficient and not have separate `insert` and `update` paths. We can create or retrieve a `test` object and perform an upsert -- creating it if it doesn't exist, or modifying it if it does -- using the `save` function:

```javascript
db.tests.save({
  name: 'application homepage',
  url: 'http://www.example.com',
  user_id: alice.id
}).then(test => {...});
```

Had we already had a test and specified its id, we'd have updated that record. Since we didn't, we have a new test instead.

#### Retrieval

Some time later, we want to retrieve that test. But we don't have the object returned from `save`, so we need to go back to the database with the primary key:

```javascript
db.tests.findOne(1).then(test => {...});
```

In the mean time, Alice has been busy and discovered several problems which are now stored in the `issues` table. We can see how many she's found with `count`:

```javascript
db.issues.count({test_id: 1}).then(total => {...});
```

Since Postgres' `count` returns a 64-bit integer and JavaScript only handles up to 53 bits, `total` will actually be a string. But thanks to JavaScript's weak typing this generally doesn't matter. Next, let's actually pull out the issue data:

```javascript
db.issues.find({
  test_id: 1
}, {
  order: [{field: 'created_at', direction: 'desc'}]
}).then(issues => {...});
```

The second object we passed defines query options; here, we're sorting the issues most recent first. There are many other options which affect query shape and results processing, and the options object can be used with many of the retrieval and persistence functions. The output of our `find` call is the `issues` array, which contains all records in that table matching the criteria we passed to `find`.

There are other retrieval functions: `where` allows us to write more complex `WHERE` clauses than those `find` can generate based on the criteria object, and `search` performs a full-text search against multiple fields in a table. [The documentation](https://dmfay.github.io/massive-js/queries.html) has more information on these.

#### Deleting

After review, it turns out that one of the issues Alice discovered was actually the application working as designed, so she needs to delete the isssue. We can do that with `destroy`:

```javascript
db.issues.destroy(3).then(issues => {...});
```

The issue has been deleted, and the record returned -- in an array this time, since `destroy` can be used with a criteria object just like we used `find` to retrieve multiple issues.

#### Functions and Scripts

Bob wants to start testing the homepage, but doesn't want to go through the entire setup process. Fortunately, there's a `copy_test` function which will let him build on Alice's work, if he passes in the test id and his userid to assign the clone to himself:

```javascript
db.copy_test(test.id, bob.id)
  .then(test => {...})
```

There's an important note here: this example assumes that Massive has been initialized with `enhancedFunctions`. With this flag enabled, Massive detects the shape of database functions' output, and will return a single record object -- or even a scalar value -- as appropriate. Since `copy_test` only makes one copy, it does return the record object. Without `enhancedFunctions`, this invocation would return an array containing the single record.

Shortly after Bob starts testing, the application is redeployed underneath him, invalidating the results he's gathered so far. He could delete issues with `destroy` either individually or in bulk, but it's faster to use the `resetTest` script. This works exactly as if it were a database function, except that `enhancedFunctions` does not perform any result type introspection, so the results will always be an array:

```javascript
db.resetTest(test.id).then(tests => {...});
```

#### Views

After Alice has finished testing, she wants to see how her results compare to Bob's. We can query the `test_stats` view just like we did the `issues` and `tests` tables, with exactly the same API functions -- the only difference is that, since it's a view, we can't persist data to it.

```javascript
db.test_stats.find({
  url: 'http://www.example.com'
}).then(stats => {...})
```

`stats` is an array of records from the view which match the criteria object.

Many views (or scripts!) combine related results from multiple tables. The `user_tests` view is one such. Rows might look like this:

| user_id | username | test_id | name   |
|---------|----------|---------|--------|
|       1 | alice    |       1 | first  |
|       1 | alice    |       2 | second |
|       2 | bob      |       3 | third  |

Databases are limited to working with this kind of information in terms of flat tables and relationships, and when you have a situation where Alice has multiple tests, that means Alice appears twice in the output. In JavaScript, however, we're more accustomed to working with object graphs where, instead of parent entities (users) being duplicated, the descendant entities (tests) are nested. Something like this:

```javascript
[{
  id: 1,
  username: 'alice',
  tests: [{
    id: 1,
    name: 'first'
  }, {
    id: 2,
    name: 'second'
  }]
}, {
  id: 2,
  username: 'bob',
  tests: [{
    id: 3,
    name: 'third'
  }]
}]
```

Massive can transform any view or script result into an object graph with the `decompose` option. The value of `decompose` is a schema which represents the desired output format. To generate the structure above:

```javascript
db.user_tests.find({}, {
  decompose: {
    pk: 'user_id',
    columns: {
      user_id: 'id',
      username: 'username'
    },
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

See the [options docs](https://dmfay.github.io/massive-js/options.html) for a complete guide to the schema object.

#### Arbitrary Queries

Alice's and Bob's passwords are both stored as plain text, because we were originally more focused on getting up and running than we were on doing things right. Now it's time to rectify this, especially since we've started adding new users through a system that hashes and salts passwords with a `hash` database function and our application login expects passwords to be hashed. So we need to ensure that all our users have hashed passwords, which we can do with an ad-hoc query in the REPL:

```javascript
db.query(
  'update users set password = hash(password) where id < $1 returning *',
  [3]
).then(users => {...});
```

The value returned is an array of rows, assuming the query returns anything. `query` is most useful for one-offs like this, or for testing when you don't want to have to reload the database API to get changes to a script file. Once the query is ready for regular use, though, it's best to put it in a file in your scripts directory so you have all your scripts in a central location.

#### Documents

The `tests` table represents a fairly limited picture of what exactly Alice and Bob are doing. An individual test may have a lot more data associated with it, and this data could be wildly different depending on what precisely is being evaluated, so simply adding more columns to `tests` isn't really an ideal solution. Postgres' JSONB functionality allows for a more free-form approach than relational databases otherwise support. Working with JSONB fields is certainly possible with the suite of standard table functions, but Massive also allows the dynamic creation and usage of dedicated document tables with a separate set of functions based on the relational data persistence and retrieval functionality.

We can create a document table dynamically by calling `saveDoc`:

```javascript
db.saveDoc('test_attributes', {
  productVersion: '1.0.5',
  testEnvironment: 'production',
  web: true,
  accessibilityStandards: ['wcag2a', 'wcag2aa']
}).then(attributes => {...});
```

The `attributes` document is exactly what we passed in, with the addition of an autogenerated primary key. The key is never stored in the document body itself, but is automatically unwrapped when you persist the document.

Once the document table has been created, it's available just like any other table. You can retrieve the document again with the primary key, or query for an array of documents matching criteria:

```javascript
db.test_attributes.findDoc(1)
  .then(attributes => {...});

db.test_attributes.findDoc({web: true})
  .then(matchingDocuments => {...});
```

Count documents with criteria:

```javascript
db.test_attributes.count({web: true})
  .then(total => {...});
```

Perform a full-text search:

```javascript
db.test_attributes.searchDoc({
  fields : ["testEnvironment", "environment", "applicationStatus"],
  term : "production"
}.then(matchingDocuments => {...});
```

Persistence functions are also adapted for document tables. You can update/insert a document with `saveDoc`; if the argument contains an `id` field, it will update the existing document in the database. If the argument contains no `id` field then it will insert a new document into the database. Either way, it returns the current state of the document.

This is not a true upsert! `saveDoc`, like `save`, determines whether to emit an `INSERT` or an `UPDATE` based on whether the data _you_ pass it contains a primary key. If you are generating primary keys manually, use `insert` instead -- if you specify a value for the primary key, it will execute an `UPDATE` whether or not the row actually exists in the database, and if it does not the result will be `null`.

```javascript
attributes.requiresAuthentication = true;

db.test_attributes.saveDoc(attributes)
  .then(attributes => {...});
```

Note that `saveDoc` replaces the _entire_ document. To change fields without having to retrieve the document, use `modify`:

```javascript
db.test_attributes.modify(1, {
  requiresAuthentication: false
}).then(attributes => {...});
```

`modify`, like `saveDoc`, returns the current version of the entire document. `modify` can also perform bulk operations with a criteria object and a changes object, just like the relational `update`:

```javascript
db.test_attributes.modify({
  web: true
}, {
  browser: 'Chrome'
}).then(changedAttributesDocs => {...});
```

When changing multiple documents, `modify` returns an array containing all updated documents.

### Accessing the Driver

Massive is focused on convenience and simplicity, not completeness. There will always be features we don't cover; that's why there's `db.query` for arbitrary SQL. In the same vein, Massive exposes the [pg-promise] driver (as `db.pgp`) and connected [Database] instance (as `db.instance`) so client code can easily use its lower-level functions when necessary.

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

db > db.tests.find({user_id: 1}).then(tests => {...});
```

In addition to the `tables` collection, the `views` and `functions` collections are also exposed on the database object.

When invoking functions, you may omit the `then` if you just want to see output -- Massive provides a resolver which logs the results to make it easy to query with the REPL.

Exit the REPL by pressing Ctrl-C twice.

## Older Versions

Install Massive.js v2: `npm install massive@2`

Documentation for Massive.js 2.x is at [readthedocs](http://massive-js.readthedocs.org/en/v2/).

Release versions are tagged and available [here](https://github.com/dmfay/massive-js/releases).

[pg-promise]:https://github.com/vitaly-t/pg-promise
[Database]:http://vitaly-t.github.io/pg-promise/Database.html
[Named Parameters]:https://github.com/vitaly-t/pg-promise#named-parameters
