# Connecting

Require Massive and invoke the function with connection information. The resulting promise resolves into a connected database instance.

The connection process is fast but does take time. The instance is intended to be maintained and reused rather than regenerated for each query.

```javascript
const massive = require('massive');

massive(connectionInfo).then(instance => {...});
```

You can connect Massive to your database with a [pg-promise configuration object](https://github.com/vitaly-t/pg-promise/wiki/Connection-Syntax#configuration-object) or a connection string. Using the former is recommended for application code since connection strings provide no mechanism for configuring the pool size and other options.

```javascript
const connectionInfo = {
  host: 'localhost',
  port: 5432,
  database: 'appdb',
  user: 'appuser',
  passsword: 'apppwd',
  ssl: false,
  poolSize: 10
};
```

```javascript
const connectionInfo =
  'postgres://appuser:apppwd@localhost:5432/appdb?ssl=false';
```

## Introspection

On connection, Massive introspects your schema to find tables, views, and functions. Along with script files, these are attached to the instance object and form your database's API.

Tables and views, including foreign tables and materialized views, are attached as objects with a set of standard access and persistence functions. See [Queries](/queries) and [Persistence](/persistence) for more details.

Database functions and scripts are attached as invocable functions. See [Functions](/functions) for more.

### Refreshing the API

If you're changing your database's schema on the go by issuing `CREATE`, `ALTER`, and `DROP` statements at runtime, the connected Massive instance will eventually be out of date since it is generated at the time of connection. The `reload` function cleans out your database's API and performs the introspection again, ensuring you can access dynamically instantiated objects.

```javascript
db.reload().then(refreshedInstance => {...});
```

### Schemas

Massive understands database schemas and treats any schema other than the default `public` as a namespace. Objects bound to the `public` schema are attached directly to the database object, while other schemas will be represented by a namespace attached to the database object, with their respective tables and views bound to the namespace.

```javascript
// query a table on the public schema
db.tests.find(...).then(...);

// query a table on the auth schema
db.auth.users.find(...).then(...);
```

## Loader Configuration and Filtering

If you don't want to load _every_ table, view, or function your user can access, Massive lets you restrict which objects are loaded through a set of white- and blacklist options on initialization. Any, all, or none of the loader configuration fields may be specified, or the object may be omitted entirely as long as driver configuration is also omitted.

Blacklists and whitelists may be comma-separated strings or an array of strings (which will be separated by commas). Either type can use SQL `LIKE` (`_` and `%` placeholders) wildcarding. Consistent with PostgreSQL naming, they are case-sensitive.

```javascript
massive(connectionInfo, {
  // change the scripts directory
  scripts: './myscripts',

  // ignore objects in any other schema
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
