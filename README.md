<img src="http://rob.conery.io/wp-content/uploads/2015/03/massive-logo.png" width=450 />

## Massive 2.0: A Postgres-centric Data Access Tool

*This is the repository for MassiveJS 2.0. If you're looking for < 2, [you can find it here](https://github.com/robconery/massive-js/releases/tag/1.0)*

Massive's goal is to **help** you get data from your database. This is not an ORM, it's a bit more than a query tool - our goal is to do just enough, then get out of your way. [I'm a huge fan of Postgres](http://rob.conery.io/category/postgres/) and the inspired, creative way you can use it's modern SQL functionality to work with your data.

ORMs abstract this away, and it's silly. Postgres is an amazing database with a rich ability to act as a document storage engine (using `jsonb`) as well as a cracking relational engine.

Massive embraces SQL completely, and helps you out when you don't feel like writing another mundane `select * from` statement.

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
db.run("select * from products where id=$1", 1, function(err,product){
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

//Send in an ORDER clause by passing in a second argument
db.products.find({},{order: "price desc"} function(err,products){
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

## Database Schema

Massive understands the notion of database schemas and treats any Postgres schema other then `public` as a namespace. Objects bound to the `public` schema (the default in Postgres) are attached directly to the root db namespace. Schemas other than `public` will be represented by binding a namespace object to the root reflecting the name of the schema. For example, to steal a previous example, let's say the `users` table was located in a back-end schema named `membership`. Massive will load up the database objects bound to the membership schema, and you can access them from code like so:

```javascript
db.membership.users.save({email : "new@example.com"}, function(err,inserted){
  //the new record with the ID
});

db.membership.users.find({active: true}, function(err,users){
  //all users who are active
});

```

## SPROC is NOT a Four Letter Word

Got a ~~tightly-wound~~ super-concientous DBA who ~~micro-manages~~ carefully limits developer access to the back end store? Feel bold, adventurous, and unconstrained by popular dogma about database functions/stored procedures? Unafraid to be called names by your less-enlightened friends?

Massive treats Postgres functions ("sprocs") as first-class citizens. 

Say your database schema introdcues a complex peice of logic in a Postgres function:

```sql
create or replace function all_products()
returns setof products
as
$$
select * from products;
$$
language sql;
```

Massive will load up and attach the all_products function, and any other Postgres function as JS functions on the root massive namespace (or on an appropriate schema-based namespace, as we just saw), which you can then access directly as functions:

```javascript
      db.all_products(function(err,res) {
        // returns the result of the function (all the product records, in this case...)
      });
```
Obviously, this was a trivial example, but you get the idea. You can perform complex logic deep in your database, and massive will make it accessible directly. 

## REPL

Massive has a REPL (Read Evaluate Print Loop - aka "console") and you can fire it up to play with your DB in the console:

```
# connect to local server, database my_database 
bin massive -d my_database
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

## Want to help?

This project is just getting off the ground and could use some help with DRYing things up and refactoring.

If you want to contribute - I'd love it! Just open an issue to work against so you get full credit for your fork. You can open the issue first so we can discuss and you can work your fork as we go along.

The code is rather hideous - I wrote it in a fit of inspiration and if you see things that could be done better, yay!

If you see a bug, please be so kind as to show how it's failing, and I'll do my best to get it fixed quickly.

