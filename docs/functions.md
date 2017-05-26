# Functions

Object-relational mappers tend to ignore functions. For many, the database exists solely as a repository, with data manipulation reserved for application logic and external jobs.

To be fair, this setup is perfectly sufficient for many use cases. But when it isn't, it _hurts_. With functions, you can perform complex operations on your data at a scope and speed unrivaled by anything else. Why go to the trouble of querying bulk data into another system and manipulating it -- only to put it back where it was with a second trip across the wire? Especially when there's a powerful, flexible language purpose-built for set operations _right there_? You wouldn't work that way, and Massive won't make you: functions are first-class citizens as far as it's concerned.

## Database Functions

All functions visible to the connecting role are attached to the Massive instance, unless the loader configuration restricts function loading. See the [Connecting](connecting) chapter for more information.

## The Scripts Directory

Massive doesn't stop at the functions present in the database itself: on startup, it looks for script files in your project and loads them up too. These files are prepared statements and can use `$1`-style placeholders.

By default, Massive searches the `/db` directory, but this can be customized by setting the `scripts` property in the loader configuration. The scripts directory can contain further subdirectories; like schemas, these are treated as namespaces. Unlike schemas, they can be nested to arbitrary depth.

Like `run`, prepared statements in script files can use named parameters instead of `$1`-style indexed parameters. Named parameters are formatted `${name}`. Other delimiters besides braces are supported; consult the pg-promise documentation for a full accounting.

Prepared statement scripts must consist of one and only one SQL statement. Common table expressions or CTEs can take some of the sting out of this requirement, but if you need to execute multiple statements with arbitrary parameters it's time to turn it into a proper function.

## Invocation

Massive treats functions and scripts identically. Each is attached as a function which may be invoked directly. Parameters may be passed in one by one or as an array. Results are returned in the usual Massive style as an array of objects.

If `enhancedFunctions` is set to `true` in the loader configuration, functions returning scalars or flat arrays will be intercepted and the results massaged into scalars or flat arrays, as appropriate. Since this represents a departure from the consistent form, it must be explicitly enabled on initialization.

```javascript
db.uuid_generate_v1mc().then(arr => {
  // an array containing the generated UUID (requires the
  // uuid-ossp extension)
});

db.myTestQueries.restartTests(5, true).then(results => {
  // this runs the prepared statement in
  // db/myTestQueries/restartTests.sql with the above
  // parameters and returns any output from a RETURNING clause
});

db.myTestQueries.restartTests({
  category: 5,
  force: true
}).then(results => {
  // as above; the prepared statement should use ${category}
  // and ${force} instead of $1 and $2.
});
```
