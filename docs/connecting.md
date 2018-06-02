# Connecting

Connect by requiring or importing Massive and invoking the function with connection information. The resulting promise resolves into a connected database instance.

The connection process is fast but does take time. The instance is intended to be maintained and reused rather than regenerated for each query.

You can connect Massive to your database with a [pg-promise configuration object](https://github.com/vitaly-t/pg-promise/wiki/Connection-Syntax#configuration-object) or a connection string. Using the former is recommended for application code since connection strings provide no mechanism for configuring the pool size and other options.

```javascript
const massive = require('massive');

massive({
  host: 'localhost',
  port: 5432,
  database: 'appdb',
  user: 'appuser',
  password: 'apppwd',
  ssl: false,
  poolSize: 10
}).then(instance => {...});
```

<!-- vim-markdown-toc GFM -->

* [Introspection](#introspection)
  * [Looking Into the Instance](#looking-into-the-instance)
  * [Schemas](#schemas)
  * [Refreshing the API](#refreshing-the-api)
  * [Refreshing Materialized Views](#refreshing-materialized-views)
* [Loader Configuration and Filtering](#loader-configuration-and-filtering)
* [Driver Configuration](#driver-configuration)

<!-- vim-markdown-toc -->

## Introspection

When you instantiate Massive, it introspects your database to discover tables, views, and functions. If you have a `/db` directory in your project root, SQL script files there are also loaded. Together, all four become an API for your database attached to the connected Massive instance itself. Schemas (and folders in `/db`) organize objects in namespaces.

Most objects can coexist if they wind up in the same namespace. For example, you might have a table named `companies` and a schema named `companies` which contains more tables. In this scenario, `db.companies` will be a table and _also_ a schema, so you might query `db.companies.find(...)` and `db.companies.audit.find(...)` as you need to.

There are two cases in which collisions will result in an error:

* When a script file or database function would override a function belonging to a loaded table or view (or vice versa): for example, `db.mytable` already has a `find()` function, so a script file named `mytable/find.sql` cannot be loaded.
* When a script file has the same path as a database function.

The introspection process is fast, but not instantaneous, and you don't want to be doing it every time you run another query. Massive is designed to be initialized once, with the instance retained and used throughout the rest of your application.  In Express, you can store the connected instance with `app.set` in your entry point and retrieve it with `req.app.get` in your routes; or with koa, using `app.context`. If no such mechanism is available, you can take advantage of Node's module caching to require the object as necessary.

If you ever need to run the introspection again, use `db.reload()` to get a promise for an up-to-date instance.

### Looking Into the Instance

To see everything Massive has discovered and loaded, use the three list functions:

```javascript
db.listTables();
db.listViews();
db.listFunctions();
```

Each returns an unsorted array of dot-separated paths (including the schema for non-public database entities, and nested directory names for script files). `listTables` includes normal and foreign tables. `listFunctions` includes both database functions and script files.

### Schemas

Massive understands database schemas and treats any schema other than the default `public` (or Postgres configured `search_path`) as a namespace. Objects bound to the `public` schema are attached directly to the database object, while other schemas will be represented by a namespace attached to the database object, with their respective tables and views bound to the namespace.

```javascript
// query a table on the public schema
db.tests.find(...).then(...);

// query a table on the auth schema
db.auth.users.find(...).then(...);
```

### Refreshing the API

If you're changing your database's schema on the go by issuing `CREATE`, `ALTER`, and `DROP` statements at runtime, the connected Massive instance will eventually be out of date since it is generated at the time of connection. The `reload` function cleans out your database's API and performs the introspection again, ensuring you can access dynamically instantiated objects.

```javascript
db.reload().then(refreshedInstance => {...});
```

### Refreshing Materialized Views

`refresh` can be used with [materialized views](https://www.postgresql.org/docs/current/static/rules-materializedviews.html), which cache the view query results to sacrifice realtime updates for performance. Materialized views must be refreshed whenever you need to ensure the information in them is up to date.

Materialized views ordinarily block reads while refreshing. To avoid this, invoke the function passing `true` to specify a concurrent refresh.

`refresh` returns an empty query result.

```javascript
db.cached_statistics.refresh(true) // concurrently
  .then(() => {...});
```

## Loader Configuration and Filtering

If you don't want to load _every_ table, view, or function your user can access, Massive lets you restrict which objects are loaded through a set of white- and blacklist options on initialization. Any, all, or none of the loader configuration fields may be specified, or the object may be omitted entirely as long as driver configuration is also omitted.

Blacklists and whitelists may be comma-separated strings or an array of strings (which will be separated by commas). Either type can use SQL `LIKE` (`_` and `%` placeholders) wildcarding. Consistent with PostgreSQL naming, they are case-sensitive.

```javascript
massive(connectionInfo, {
  // change the scripts directory
  scripts: './myscripts',

  // only load tables, views, and functions in these schemas
  allowedSchemas: ['public', 'auth'],   

  // only load tables and views matching the whitelist
  whitelist: ['test%', 'users'],

  // never load these tables or views...
  blacklist: 'device%, issue',

  // ...unless they appear here
  exceptions: ['device_sessions'],

  // only load functions matching the whitelist
  functionWhitelist: ['%user%'],

  // never load functions on the blacklist
  functionBlacklist: 'authorizeUser,disableUser',

  // streamline function return values: a function with a scalar
  // value will return just the scalar instead of an array, etc.
  enhancedFunctions: true,

  // don't load database functions at all
  excludeFunctions: true,

  // don't load materialized views (required for Postgres < 9.3)
  excludeMatViews: true
}).then(instance => {...});
```

## Driver Configuration

The third argument to the Massive constructor is a [driverConfig](https://vitaly-t.github.io/pg-promise/module-pg-promise.html) object passed directly through to pg-promise. Please consult the pg-promise documentation for more information.

```javascript
massive(connectionInfo, loaderConfig, {
  // use native bindings (must be installed separately)
  pgNative: true,

  // don't log any warnings from the driver
  noWarnings: true
}).then(instance => {...});
```
