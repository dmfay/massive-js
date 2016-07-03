## The Simplest Query: Inline SQL

If you have a simple query to run and you want to do it inline, you can do so:

```js
db.run("select * from products", function(err, res){
  // all products returned in array
});
```

You can parameterize the query and safeguard against SQL injection attacks with placeholders. Note that the values need to be specified as an array:

```js
db.run("select * from products where name LIKE $1", ["%fruity%"], function(err, res){
  // all matching products returned in array
});
```

Additional parameters are interpolated in left-to-right order as `$2`, `$3`, etc.

## Using `where()`

You can save yourself from repeated `select * from` typing by accessing the loaded table or view on your DB instance and then using `where()`. Our `find` syntax is quite helpful, but we've added this method so you can find what you need if your WHERE statement is complex:

```js
db.products.where("id=$1 OR id=$2", [10, 21], function(err, products){
  // products 10 and 21
});
```

## Using `find()` and `findOne()`

Most queries don't need the full flexibility afforded by a handwritten WHERE clause, and translating parameters into an ordered list for interpolation is a messy business at best. The `find()` and `findOne()` functions support a more abstracted query syntax which is still flexible enough to cover almost all ordinary cases.

`find()` generally returns results in an Array, unless invoked with an integer or UUID primary key, or with the `single` option. `findOne()` always returns a single object.

### The Basics

```js
// find by id
db.products.find(1, function(err, res){
  // res.id == 1
});

// another way to do the above
db.users.findOne(1, function(err, user){
  // returns user with id (or whatever your PK is) of 1
});

// find first match
db.users.findOne({email : "test@test.com"}, function(err, user){
  // returns the first match
});

// all active users
db.users.find({active: true}, function(err, users){
  // all users who are active
});
```

### Conditions
Most of the common ANSI and Postgres-specific boolean operators are supported,
in as close to actual Postgres syntax as possible. Certain alternative forms can
also be used: for instance, while the standard syntax for inequality is `<>`,
Massive will also recognize and convert `!` and `!=`.

Where applicable, operators are case-insensitive: `like` and `LIKE` are equally
valid.

#### Comparison
* `=` (equality): `{price: 20}`, `{"price =": 20}`
* `<>` (inequality): `{"price <>": 20}`, `{"price !=": 20}`, `{"price !": 20}`
* `<` (less than): `{"price <": 20}`
* `>` (greater than): `{"price >": 20}`
* `<=` (less than or equal): `{"price <=": 20}`
* `>=` (greater than or equal): `{"price >=": 20}`

#### Null values
* `IS NULL`: `{description: null}`, `{"description =": null}`
* `IS NOT NULL`: `{"description <>": null}`, `{"description !=": null}`, `{"description !": null}`
* `IS DISTINCT FROM` (null-sensitive `<>`): `{"color is distinct from": "red"}`
* `IS NOT DISTINCT FROM` (null-sensitive `=`): `{"color is not distinct from": "red"}`

#### Membership
* `IN` (membership): `{id: [10, 21]}`
* `NOT IN` (absence): `{"id <>": [10, 21]}`

#### Array Membership
* `@>` (contains): `{"categories @>": ["things", "stuff"]}`
* `<@` (contained by): `{"categories <@": ["things", "stuff"]}`
* `&&` (overlap): `{"categories &&": ["things", "stuff"]}`

#### Pattern Matching
* `LIKE` (match): `{"name like": "%New and Improved%"}`, `{"name ~~": "%New and Improved%"}`
* `NOT LIKE` (no match): `{"name not like": "%New and Improved%"}`, `{"name !~~": "%New and Improved%"}`
* `ILIKE` (case-insensitive match): `{"name ilike": "%new and improved%"}`, `{"name ~~*": "%new and improved%"}`
* `NOT ILIKE` (no case-insensitive match): `{"name not ilike": "%new and improved%"}`, `{"name !~~*": "%new and improved%"}`
* `SIMILAR TO` (regexlike match): `{"name similar to": "%New (and|\&) Improved%"}`
* `NOT SIMILAR TO` (no regexlike match): `{"name not similar to": "%New (and|\&) Improved%"}`

#### Regular Expressions
Postgres supports the POSIX standard for regular expressions.

* `~` (case-sensitive match): `{"name ~": "%New (and|\&) Improved%"}`
* `!~` (no case-sensitive match): `{"name !~": "%New (and|\&) Improved%"}`
* `~*` (case-insensitive match): `{"name ~*": "%new (and|\&) improved%"}`
* `!~*` (no case-insensitive match): `{"name !~*": "%new (and|\&) improved%"}`

### Predicate Subgroups
The standard object syntax generates a predicate which simply ANDs together all
provided conditions. Hand-tuned scripts can define much more complex predicates,
but using them sacrifices the flexibility defining criteria at runtime. Passing
an `or` key with an array of subgroups will produce a predicate which includes
rows satisfying any one subgroup:

```js
db.products.find({
  or: [{
    "price <=": 10,
    "in_stock": true
  }, {
    "id": 1234
  }]
}, function (err, products) {
  // all products in stock costing less than $10, and also product #1234
});
```

`or` may be used in conjunction with the standard object criteria syntax, and
supports operations, null values, JSON drilldown, and everything else allowable
in the standard set.

### Casting

Postgres syntax for casting is supported for simple cases: 
`{'field::text LIKE': '%value%'}` and the like. More complex casts such as from
JSON or JSONB traversal operations are not supported in the criteria API as yet.

### Query Options

Most table and view query functions, including `find`, `findOne`, `findDoc`,
and `count` (if invoked with a criteria object rather than a plaintext `WHERE`
clause), accept an `options` object which controls various parameters of the
query's specification and execution.

* **columns** supplies an alternate select list as an array of column names or
expressions. If not provided, queries return all fields found.
* **order** adds the value to the emitted query as an `ORDER BY` clause. Massive
doesn't do any parsing or processing, so everything has to be exactly as you'd
paste it into psql yourself.
* **offset** skips the first *n* rows that would have been returned by the
query.
* **limit** stops the query after *n* rows have been discovered.
* **stream** if true turns streaming on for the query.
* **single** if true forces the query to return the first row as an object,
rather than an array of rows.

Not all options apply everywhere; for example, since `findOne` already returns
only one result row as an object, most options will be redundant or of little
use, except for `columns`. Meanwhile, `findDoc` always returns entire documents,
ignoring `columns`.

```js
db.products.find({
  in_stock: true
}, {
  columns: ["name", "price", "description"],
  order: "price desc",
  offset: 20,
  limit: 10
}, function (err, products) {
  // ten name/price/description objects, ordered by price high to low, skipping
  // the twenty most expensive products
});
```

#### Complex Ordering

The simplest possible `order` is a string which will be directly interpolated
into the emitted query. However, Massive can also assemble an `ORDER BY` clause
from an array of expressions.

Each element in the array _must_ contain a `field` representing the expression
being sorted on, generally the name of a column. The `direction` may be `asc` or
`desc`. If the expression requires casting (common for sorting properties of
JSON fields) the `type` determines that.

```js
db.products.find({
  in_stock: true
}, {
  order: [
    {field: "price", direction: "desc"},
    {field: "specs->>'height'", direction: "asc", type: "int"}
  ]
}, function (err, products) {...});
```

If you're querying a document table and don't want to write out all the 
`body->>'field'` boilerplate yourself you can set `options.orderBody` to true
and Massive will handle it. The one major limitation is that this allows you to
sort _only_ by fields in the document body, since the traversal operator is
applied to every order expression.

### JSON Drilldown

You can navigate `json` and `jsonb` fields using the Postgres JSON operators:

```js
// match a JSON field
db.products.find({"specs->>weight": 30}, function(err, products) {
  // products where the 'specs' field is a JSON document containing {weight: 30}
  // note that the corresponding SQL query would be phrased specs->>'weight'; Massive adds the quotes for you
});

// match a JSON field with an IN list (note NOT IN is not supported for JSON fields at this time)
db.products.find({"specs->>weight": [30, 35]}, function(err, products) {
  // products where the 'specs' field is a JSON document containing {weight: 30}
  // note that the corresponding SQL query would be phrased specs->>'weight'; Massive adds the quotes for you
});

// drill down a JSON path
db.products.find({"specs#>>{dimensions, length}": 15}, function(err, products) {
  // products where the 'specs' field is a JSON document having a nested 'dimensions' object containing {length: 15}
  // note that the corresponding SQL query would be phrased specs#>>'{dimensions, length}'; Massive adds the quotes for you
});
```

## Using `count()`

`count()` has exactly the same query syntax as `find()`, but returns the number of rows rather than the data in them.

```js
db.products.count({id: [1, 2]}, function(err, res){
  // returns 2 as the result
});
```

## Using Schemas

If you like to separate your tables based on a schema, you can still work with them easily with Massive. For instance, our `users` table might be part of the `membership` schema:

```js
db.membership.users.find(1, function(err, res){
  // user returned
});
```
