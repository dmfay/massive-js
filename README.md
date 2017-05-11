<img src="http://rob.conery.io/img/2015/03/massive-logo.png" width=450 />

## Massive 2.0: A Postgres-centric Data Access Tool

[![Build Status](https://travis-ci.org/dmfay/massive-js.svg?branch=master)](https://travis-ci.org/dmfay/massive-js)

*This is the repository for MassiveJS 2.0. If you're looking for < 2, [you can find it here](https://github.com/dmfay/massive-js/releases/tag/1.0)*

Massive's goal is to **help** you get data from your database. This is not an ORM, it's a bit more than a query tool - our goal is to do just enough, then get out of your way. [I'm a huge fan of Postgres](http://rob.conery.io/category/postgres/) and the inspired, creative way you can use it's modern SQL functionality to work with your data.

ORMs abstract this away, and it's silly. Postgres is an amazing database with a rich ability to act as a document storage engine (using `jsonb`) as well as a cracking relational engine.

Massive embraces SQL completely, and helps you out when you don't feel like writing another mundane `select * from` statement.

## Documentation
Full documentation is available [here](http://massive-js.readthedocs.org/en/latest/).


## Installation

```
npm install massive --save
```

Once Massive is installed, you can use it by calling `connect` and passing in a callback which will give you your database instance:

```javascript
var massive = require("massive");

//you can use db for 'database name' running on localhost
//or send in everything using 'connectionString'
massive.connect({db : "myDb"}, function(err,db){
  db.myTable.find();
});
```
## Usage

One of the key features of Massive is that it loads all of your tables, Postgres functions, and local query files up as functions (this is really cool, you want this. See below for more info). Massive is fast, and does this quickly. However, there is a one-time execution penalty at intialization while all this happens. In most situations it makes sense to do this once, at application load. From there, maintain a reference to the Massive instance (Massive was conceived with this usage in mind). For example, if you are using Express as your application framework, you might do something like this:

####Express Example

```javascript
var express = require("express");
var app = express();
var http = require('http');
var massive = require("massive");
var connectionString = "postgres://massive:password@localhost/chinook";

// connect to Massive and get the db instance. You can safely use the
// convenience sync method here because its on app load
// you can also use loadSync - it's an alias
var massiveInstance = massive.connectSync({connectionString : connectionString})

// Set a reference to the massive instance on Express' app:
app.set('db', massiveInstance);
http.createServer(app).listen(8080);
```
From there, accessing the db is just:

```javascript
var db = app.get('db');
```

## SQL Files as Functions

Massive supports SQL files as root-level functions. By default, if you have a `db` directory in your project (you can override this by passing in a `scripts` setting), Massive will read each SQL file therein and create a query function with the same name. If you use subdirectories, Massive will namespace your queries in the exact same way:

```javascript
var massive = require("massive");

massive.connect({
  connectionString: "postgres://localhost/massive"}, function(err, db){
  //call the productsInStock.sql file in the db/queries directory
  db.productsInStock(function(err,products){
    //products is a results array
  });
});
```

You can use arguments right in your SQL file as well. Just format your parameters in SQL
using `$1`, `$2`, etc:

```javascript
var massive = require("massive");

massive.connect({db : "myDb"}, function(err, db){
  //just pass in the sku as an argument
  //your SQL would be 'select * from products where sku=$1'
  db.productsBySku("XXXYYY", function(err,products){
    //products is a results array
  });
});
```

The SQL above is, of course, rather simplistic but hopefully you get the idea: *use SQL to its fullest, we'll execute it safely for you*.

## Attached Tables

When Massive starts up it scans your tables as well and drops a queryable function on the root namespace. This means you can query your tables as if they were objects right on your db instance:

```javascript
db.users.find(1, function(err,res){
  //user with ID 1
});
```

The goal with this API is expressiveness and terseness - allowing you to think as little as possible about accessing your data.

Massive looks for a primary key in order to enable simpler writes, and ignores tables without primary keys. The only exception is foreign tables, which cannot have primary keys.

## Full Text Search Built In

If you need to query a table or a document store using Postgres' built-in Full Text Indexing, you certainly can. Just use `search` or `searchDoc` and we'll build the index on the fly:

```javascript
db.users.search({columns :["email"], term: "rob"}, function(err,users){
  //all users with the word 'rob' in their email
});
```

This works the same for documents as well (more on documents in next section):

```javascript
//full text search...
db.my_documents.searchDoc({
  keys : ["title", "description"],
  term : "Kauai"
}, function(err,docs){
  //docs returned with an on-the-fly Full Text Search for 'Kauai'
});
```

## Full JSONB Document Support

Another thing that is great about Postgres is the `jsonb` functionality. The queries are simple enough to write - but if you just want to encapsulate it all - we've got your back!

```javascript
//connect massive as above
var newDoc = {
  title : "Chicken Ate Nine",
  description: "A book about chickens of Kauai",
  price : 99.00,
  tags : [
    {name : "Simplicity", slug : "simple"},
    {name : "Fun for All", slug : "fun-for-all"}
  ]
};

db.saveDoc("my_documents", newDoc, function(err,res){
  //the table my_documents was created on the fly
  //res is the new document with an ID created for you
});

//you can now access the document right on the root
db.my_documents.findDoc(1, function(err,doc){
  //you now have access to the doc
});

//run a 'contains' query which flexes the index we created for you
db.my_documents.findDoc({price : 99.00}, function(err,docs){
  //1 or more documents returned
});

//run a deep match passing an array of objects
//again flexing the index we created for you
db.my_documents.findDoc({tags: [{slug : "simple"}]}, function(err,docs){
  //1 or more documents returned
});

//comparative queries - these don't use indexing
db.my_documents.findDoc({"price >": 50.00}, function(err,docs){
  //1 or more documents returned with a price > 50
});

//IN queries by passing arrays
db.my_documents.findDoc({id : [1,3,9]}, function(err,docs){
  //documents with ID 1, 3, and 9
});

//NOT IN
db.my_documents.findDoc({"id <>": [3,5]}, function(err,docs){
  //documents without ID 3 and 5
});

// save a document; will insert if there is no id field
newDoc.author = "Jane Smith";
db.my_documents.saveDoc(newDoc, function (err, doc) {
  // updated document record
});

// set a single document attribute
db.my_documents.setAttribute(1, "price", 95.95, function (err, doc) {
  // updated document record
});

// set multiple attributes
db.my_documents.setAttributes(1, {"price": 90.00, "stock": 12}, function (err, doc) {
  // updated document record
});

// Create an empty schema
db.createSchema('my_schema', function(err, res) {
  // empty array
});

// Drop schema
db.dropSchema('my_schema', {cascade: true|false}, function(err, res) {
  // empty array
});

// Create a new table
db.createDocumentTable('my_table', function(err, res) {
  // empty array
});

// Create a new table on explicit schema
db.createDocumentTable('my_schema.my_table', function(err, res) {
  // empty array
});

// Drop table
db.dropTable('my_table', {cascade: true|false}, function(err, res) {
  // empty array
});

// Drop table on explicit schema
db.dropTable('my_schema.my_table', {cascade: true|false}, function(err, res) {
  // empty array
});



```

#### A Word About IDs in Document Tables

We store IDs in their own column and treat them as a normal Primary Key. These values are **not** duplicated in the database - instead they are pulled off during writes and readded during reads.

## Helpful Relational Bits

The entire API above works the same with relational tables, just remove "Doc" from the function name (`find`, `search`, `save`);

When you run `connect` massive executes a quick `INFORMATION_SCHEMA` query and attaches each table to the main namespace (called `db` in these examples). You can use this to query your tables with a bit less noise.

The API is as close to Massive 1.0 as we could make it - but there's no need for `execute` - just run the query directly:

```javascript
//connect massive, get db instance

//straight up SQL
db.run("select * from products where id=$1", [1], function(err,product){
  //product 1
});

//simplified SQL with a where
db.products.where("id=$1 OR id=$2", [10,21], function(err,products){
  //products 10 and 21
});

//an IN query
db.products.find({id : [10,21]}, function(err,products){
  //products 10 and 21
});

//a NOT IN query
db.products.find({"id <>": [10,21]}, function(err,products){
  //products other than 10 and 21
});

//match a JSON field
db.products.find({"specs->>weight": 30}, function(err, products) {
  //products where the 'specs' field is a JSON document containing {weight: 30}
  //note that the corresponding SQL query would be phrased specs->>'weight'; Massive adds the quotes for you
})

//match a JSON field with an IN list (note NOT IN is not supported for JSON fields at this time)
db.products.find({"specs->>weight": [30, 35]}, function(err, products) {
  //products where the 'specs' field is a JSON document containing {weight: 30}
  //note that the corresponding SQL query would be phrased specs->>'weight'; Massive adds the quotes for you
})

//drill down a JSON path
db.products.find({"specs#>>{dimensions,length}": 15}, function(err, products) {
  //products where the 'specs' field is a JSON document having a nested 'dimensions' object containing {length: 15}
  //note that the corresponding SQL query would be phrased specs->>'{dimensions,length}'; Massive adds the quotes for you
})

//Send in an ORDER clause by passing in a second argument
db.products.find({},{order: "price desc"}, function(err,products){
  //products ordered in descending fashion
});

//Send in an ORDER clause and a LIMIT with OFFSET
var options = {
  limit : 10,
  order : "id",
  offset: 20
}
db.products.find({}, options, function(err,products){
  //products ordered in descending fashion
});

//You only want the sku and name back
var options = {
  limit : 10,
  columns : ["sku", "name"]
}
db.products.find({}, options, function(err,products){
  // an array of sku and name
});

//find a single user by id
db.users.findOne(1, function(err,user){
  //returns user with id (or whatever your PK is) of 1
});

//another way to do the above
db.users.find(1, function(err,user){
  //returns user with id (or whatever your PK is) of 1
});

//find first match
db.users.findOne({email : "test@test.com"}, function(err,user){
  //returns the first match
});

//simple query
db.users.find({active: true}, function(err,users){
  //all users who are active
});

//include the PK in the criteria for an update
db.users.save({id : 1, email : "test@example.com"}, function(err,updated){
  //the updated record for the new user
});

//no PK does an INSERT
db.users.save({email : "new@example.com"}, function(err,inserted){
  //the new record with the ID
});
```

## Streams

To improve performance over large result sets, you might want to consider using a stream. This has the upside of returning reads right away, but the downside of leaving a connection open until you close it. To use a stream, just send in `{stream: true}` in the options:

```js
db.users.find({company_id : 12}, {stream:true}, function(err,stream){

  stream.on('readable', function(){
    var user = stream.read();
    //do your thing
  });

  stream.on('end', function(){
    //deal with results here
  });
});
```

## Database Schema

Massive understands the notion of database schemas and treats any Postgres schema other than `public` as a namespace. Objects bound to the `public` schema (the default in Postgres) are attached directly to the root db namespace. Schemas other than `public` will be represented by binding a namespace object to the root reflecting the name of the schema. To steal a previous example, let's say the `users` table was located in a back-end schema named `membership`. Massive will load up the database objects bound to the membership schema, and you can access them from code like so:

```javascript
db.membership.users.save({email : "new@example.com"}, function(err,inserted){
  //the new record with the ID
});

db.membership.users.find({active: true}, function(err,users){
  //all users who are active
});

```

## Synchronous Methods

Just about every method in Massive has a synchronous counterpart using [the deasync library](https://github.com/vkurchatkin/deasync). These methods are here for convenience when you're not worried about I/O and just want to move some data around without a callback mess.

```js
var myUser = db.users.findOneSync({id : 1});
```

## We <3 Functions

Got a ~~tightly-wound~~ super-concientous DBA who ~~micro-manages~~ carefully limits developer access to the back end store? Feel bold, adventurous, and [unconstrained by popular dogma](http://rob.conery.io/2015/02/21/its-time-to-get-over-that-stored-procedure-aversion-you-have/) about database functions/stored procedures? Unafraid to be called names by your less-enlightened friends?

Massive treats Postgres functions ("sprocs") as first-class citizens.

Say your database schema introduces a complex piece of logic in a Postgres function:

```sql
create or replace function all_products()
returns setof products
as
$$
select * from products;
$$
language sql;
```

Massive will load up and attach the `all_products` function, and any other Postgres function as JS functions on the root massive namespace (or on an appropriate schema-based namespace, as we just saw), which you can then access directly as functions:

```javascript
db.all_products(function(err,res) {
  // returns the result of the function (all the product records, in this case...)
});
```
Obviously, this was a trivial example, but you get the idea. You can perform complex logic deep in your database, and massive will make it accessible directly. For a deeper dive on this, see [pg-auth](https://github.com/robconery/pg-auth), which basically [rolls common membership up into a box](http://rob.conery.io/2015/03/17/membership-in-a-box-with-pg-auth/) and tucks the auth pain away behind a pleasing facade of Postgres functions. Guaranteed to stir up spirited discussions with your friends and neighbors.

If you're using a function that takes multiple parameters, you'll need to wrap your arguments in an array:

```js
db.myFunction(['thing1', 'thing2'], function(err,res){
  //result is always an array
})
```

## REPL

Massive has a REPL (Read Evaluate Print Loop - aka "console") and you can fire it up to play with your DB in the console. The easiest way to access the REPL is to install Massive globally:

```
npm install --global massive
```

You can then connect to your database using the `massive` command:

```
# connect to local server, database my_database
massive -d my_database
db >
```

From here you can see your tables if you like:

```
db > db.tables
[ { name: 'docs',
    pk: 'id',
    db: { connectionString: 'postgres://localhost/massive' } },
  { name: 'products',
    pk: 'id',
    db: { connectionString: 'postgres://localhost/massive' } },
  { name: 'users',
    pk: 'id',
    db: { connectionString: 'postgres://localhost/massive' } } ]
db >
```

Or just list out your queries to be sure they're being loaded:

```
db > db.queries
[ { [Function]
    sql: 'select * from users where email=$1;',
    db: { connectionString: 'postgres://localhost/massive' } } ]
db >
```

Execute your query to make sure it returns what you expect:

```
db > db.queries.productById(1);
[ {sku : 'x', name : "Product 1", id : '1'}]
```

By default, Massive provides a callback for you if you don't pass one in. This automatic callback outputs the results using `console.log` so you can play with things easily.


There's more to do with the massive REPL - such as generating query files for you (if you're not accomplished at SQL just yet) as well as a better way to play with the results.

## Development

The tests are run against a local `massive` database.

First create the database:

```
createdb massive
```

You can then run the tests:

```
npm test
```

To check your code for linting errors, run:

```
npm run lint
```

To generate a test coverage report, run:

```
npm run coverage
```

## Want to help?

This project is just getting off the ground and could use some help with DRYing things up and refactoring.

If you want to contribute - I'd love it! Just open an issue to work against so you get full credit for your fork. You can open the issue first so we can discuss and you can work your fork as we go along.

The code is rather hideous - I wrote it in a fit of inspiration and if you see things that could be done better, yay!

If you see a bug, please be so kind as to show how it's failing, and I'll do my best to get it fixed quickly.
