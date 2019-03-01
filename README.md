# Massive.js: A Postgres-centric Data Access Tool

[![node](https://img.shields.io/node/v/massive.svg)](https://npmjs.org/package/massive)
[![Build Status](https://travis-ci.org/dmfay/massive-js.svg?branch=master)](https://travis-ci.org/dmfay/massive-js)
[![Coverage Status](https://coveralls.io/repos/gitlab/dmfay/massive-js/badge.svg)](https://coveralls.io/gitlab/dmfay/massive-js)
[![npm](https://img.shields.io/npm/dw/massive.svg)](https://npmjs.org/package/massive)

Massive.js is a data mapper for Node.js that goes all in on PostgreSQL and fully embraces the power and flexibility of the SQL language and relational metaphors. Providing minimal abstractions for the interfaces and tools you already use, its goal is to do just enough to make working with your data as easy and intuitive as possible, then get out of your way.

Massive is _not_ an object-relational mapper (ORM)! It doesn't use models, it doesn't track state, and it doesn't limit you to a single entity-based metaphor for accessing and persisting data. Massive connects to your database and introspects its schemas to build an API for the data model you already have: your tables, views, functions, and easily-modified SQL scripts.

Here are some of the highlights:

* **Dynamic query generation**: Massive's versatile query builder supports a wide variety of operators, all generated from a simple criteria object.
* **Low overhead**: An API built from your schema means no model classes to maintain, super-simple bulk operations, and direct access to your tables without any need to create or load entity instances beforehand.
* **Document storage**: PostgreSQL's JSONB storage type makes it possible to blend relational and document strategies. Massive offers a robust API to simplify working with documents: objects in, objects out, with document metadata managed for you.
* **Relational awareness**: Massive does not traverse relationships or build model graphs, but [deep inserts](https://massivejs.org/docs/persistence#deep-insert) can create related entities and junctions transactionally, and the [`decompose` option](https://massivejs.org/docs/resultset-decomposition) allows you to map the results of complex views and scripts to nested object trees.
* **Transactions**: New in v5, use [`db.withTransaction`](https://massivejs.org/docs/tasks-and-transactions) to execute a callback with full Massive API support in a transaction scope, getting a promise which fulfills if it commits or rejects if it rolls back.
* **Postgres everything**: Commitment to a single RDBMS lets us use it to its full potential. Massive supports array fields and operations, regular expression matching, foreign tables, materialized views, and more features found in PostgreSQL but not in other databases.

## Installation

```
npm i massive --save
```

## Documentation

Documentation and API docs are at [MassiveJS.org](https://massivejs.org).

## Contributing

[See CONTRIBUTING.md](https://gitlab.com/dmfay/massive-js/blob/master/CONTRIBUTING.md).

## Older Versions

If you need a callback-based API, install Massive.js v2: `npm install massive@2`

Documentation for Massive.js 2.x is at [readthedocs](http://massive-js.readthedocs.org/en/v2/).

[pg-promise]:https://github.com/vitaly-t/pg-promise
[Database]:http://vitaly-t.github.io/pg-promise/Database.html
[Named Parameters]:https://github.com/vitaly-t/pg-promise#named-parameters
