## Function Loading
Massive treats Postgres functions as first-class citizens. Every function in the database is loaded into a corresponding function on the instance object. Just like tables and views, functions in non-public schemata are namespaced accordingly. Names are case-sensitive: `all_products` and `All_Products` functions in the database will both be loaded into Massive.

Database functions are loaded after tables and views, and so will win collisions. Function loading may be omitted by including `{excludeFunctions: true}` in the `connect()` args.

```sql
create or replace function products_in_stock()
returns setof products
as
$$
select * from products where in_stock = true;
$$
language sql;
```

## The DB Directory
Massive doesn't stop at the functions present in the database itself. On startup, it looks for a `db` directory at the root of your project (this may be overridden by passing a `scripts` property in the `connect()` args) and loads each SQL file present as a top-level function on the instance object. Each function will have the same name as the script file, sans the `.sql` extension. Subdirectories act as namespaces in a manner similar to the loading of database functions by schema.

Script files are loaded last on initialization, and will override any already-loaded tables, views, or database functions with the same name.

A simple query script file named `products_in_stock.sql` residing in the appropriate `db` directory reproduces the products_in_stock database function above:

```sql
select * from products
where in_stock = true;
```

Scripts may be parameterized, using the standard $x notation:

```sql
select * from products
where in_stock = $1 and price < $2;
```

## Function Invocation
Functions are invoked in the same way regardless of whether they were originally defined in the database or in script files. For asynchronous invocation, the callback will always take the form of a function with error and result arguments.

```js
var massive = require("massive");

massive.connect({
  connectionString: "postgres://localhost/massive"}, function(err, db) {
  //products_in_stock may be either a function on the database or a SQL file in /db
  db.products_in_stock(function(err, products) {
    //products is a results array
  });
});
```

### Experimental: Enhanced Functions

Massive can interpret the return types of functions, however this breaks backwards compatibility and thus must be opted into with setting `enhancedFunctions: true`.

For example, if you have this [getRandomNumber function](https://xkcd.com/221/):

```sql
create function myschema."getRandomNumber"()
returns integer as $$
select 4; -- chosen by fair dice roll.
          -- guaranteed to be random.
$$ language sql;
```

Without `enhancedFunctions` you'd get the same results as a regular table fetch - a set of rows: `[{"getRandomNumber": 4}]`.

With `enhancedFunctions: true`, you'd get simply the result of the function: `4`.

```js
var massive = require("massive");

massive.connect({
  connectionString: "postgres://localhost/massive",
  enhancedFunctions: true // Enable return type honoring
}, function(err, db) {
  db.getRandomNumber(function(err, randomNumber) {
    //randomNumber is the integer 4
  });
});
```

This also works for text, arrays, JSON, text domains and some other types. If it doesn't work for your use case, please raise an issue (or a PR!); we're aware of some restrictions due to [how the pg module currently handles types](https://github.com/brianc/node-postgres/issues/986).

## Parameters
Many, if not most, functions will expect some sort of input.

```js
var massive = require("massive");

massive.connect({
  connectionString: "postgres://localhost/massive"}, function(err, db) {
  db.top_x_products(5, function(err, products) {
    //products is a results array
  });
});
```

And you can do that with multiple inputs as well:

```js
var massive = require("massive");

massive.connect({
  connectionString: "postgres://localhost/massive"}, function(err, db) {
  db.top_x_products_by_country(5, 'US', function(err, products) {
    //products is a results array
  });
});
```

You may also pass in multiple arguments as a single Array, but you do not have to:

```js
var massive = require("massive");

massive.connect({
  connectionString: "postgres://localhost/massive"}, function(err, db) {
  db.top_x_products_by_country([5, 'US'], function(err, products) {
    //products is a results array
  });
});
```

The inputs must be scalars.  You may not pass in objects or arrays as arguments per-se.  You are allowed to group all inputs into an array and pass them in as that (as demonstrated in the last example), should you like to do so.

