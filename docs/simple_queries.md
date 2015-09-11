## The Simplest Query: Inline SQL

If you have a simple query to run and you want to do it inline, you can do so:

```js
db.run("select * from products", function(err, res){
  //all products returned in array
});
```

You can parameterize the query and safeguard against SQL injection attacks with placeholders. Note that the values need to be specified as an array:

```js
db.run("select * from products where name LIKE $1", ["%fruity%"], function(err, res){
  //all matching products returned in array
});
```

Additional parameters are interpolated in left-to-right order as `$2`, `$3`, etc.

## Using `where()`

You can save yourself from repeated `select * from` typing by accessing the loaded table or view on your DB instance and then using `where()`. Our `find` syntax is quite helpful, but we've added this method so you can find what you need if your WHERE statement is complex:

```js
db.products.where("id=$1 OR id=$2", [10, 21], function(err, products){
  //products 10 and 21
});
```

## Using `find()` and `findOne()`

Most queries don't need the full flexibility afforded by a handwritten WHERE clause, and translating parameters into an ordered list for interpolation is a messy business at best. The `find()` and `findOne()` functions support a more abstracted query syntax which is still flexible enough to cover almost all ordinary cases.

`find()` generally returns results in an Array; the sole exception is if it is invoked with a primary key. `findOne()` always returns a single object.

```js
//find by id
db.products.find(1, function(err, res){
  //res.id == 1
});

//another way to do the above
db.users.findOne(1, function(err, user){
  //returns user with id (or whatever your PK is) of 1
});

//find first match
db.users.findOne({email : "test@test.com"}, function(err, user){
  //returns the first match
});

//all active users
db.users.find({active: true}, function(err, users){
  //all users who are active
});

//Send in an ORDER clause and a LIMIT with OFFSET
var options = {
  limit : 10,
  order : "id",
  offset: 20
}
db.products.find({}, options, function(err, products){
  //products ordered in descending fashion
});

//You only want the sku and name back
var options = {
  limit : 10,
  columns : ["sku", "name"]
}
db.products.find({}, options, function(err, products){
  // an array of sku and name
});

//an IN query
db.products.find({id : [10, 21]}, function(err, products){
  //products 10 and 21
});

//a NOT IN query
db.products.find({"id <>": [10, 21]}, function(err, products){
  //products other than 10 and 21
});

db.products.find({"id < " : 2}, function(err, res){
  //id less than 2
});

db.products.find({"id < " : 2}, function(err, res){
  //id greater than 2
});

//Send in an ORDER clause by passing in a second argument
db.products.find({}, {order: "price desc"} function(err, products){
  //products ordered in descending fashion
});
```

You can also drill down into `json` and `jsonb` fields using the Postgres JSON operators:

```js
//match a JSON field
db.products.find({"specs->>weight": 30}, function(err, products) {
  //products where the 'specs' field is a JSON document containing {weight: 30}
  //note that the corresponding SQL query would be phrased specs->>'weight'; Massive adds the quotes for you
});

//match a JSON field with an IN list (note NOT IN is not supported for JSON fields at this time)
db.products.find({"specs->>weight": [30, 35]}, function(err, products) {
  //products where the 'specs' field is a JSON document containing {weight: 30}
  //note that the corresponding SQL query would be phrased specs->>'weight'; Massive adds the quotes for you
});

//drill down a JSON path
db.products.find({"specs#>>{dimensions, length}": 15}, function(err, products) {
  //products where the 'specs' field is a JSON document having a nested 'dimensions' object containing {length: 15}
  //note that the corresponding SQL query would be phrased specs#>>'{dimensions, length}'; Massive adds the quotes for you
});
```

## Using `count()`

`count()` has exactly the same query syntax as `find()`, but returns the number of rows rather than the data in them.

```js
db.products.count({id: [1, 2]}, function(err, res){
  //returns 2 as the result
});
```

## Using Schemas

If you like to separate your tables based on a schema, you can still work with them easily with Massive. For instance, our `users` table might be part of the `membership` schema:

```js
db.membership.users.find(1, function(err, res){
  //user returned
});
```
