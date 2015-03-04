
## Pre-Alpha!

This is a rapidly changing branch for MassiveJS - not quite ready for prime time! I'm leaning on **open development** because ... why not :).

*Why am I doing this?*. I've extracted a number of ideas here from a project I'm building, and I liked how it was coming together so I thought I would share.

*Don't you hate ORMs Rob?*. Yes, I sure do. But I also like decent abstraction and encapsulation. My goal is to hit the sweet spot between that and the joy of SQL in Postgres.

## Massive 2.0: A Postgres-centric Data Access Tool

Massive's goal is to **help** you get data from your database. This is not an ORM, it's a bit more than a query tool - our goal is to do just enough, then get out of your way. [I'm a huge fan of Postgres](http://rob.conery.io/category/postgres/) and the inspired, creative way you can use it's modern SQL functionality to work with your data.

ORMs abstract this away, and it's silly. Postgres is an amazing database with a rich ability to act as a document storage engine (using `jsonb`) as well as a cracking relational engine.

Massive embraces SQL completely, and helps you out when you don't feel like writing another mundane `select * from` statement. Here's how...

## SQL Files as Functions

Massive supports SQL files as root-level functions. By default, if you have a `db` directory in your project, Massive will read each SQL file therein and create a query function with the same name:

```sql
/* this is in db/productsInStock.sql */

select * from products
where in_stock=true;
```

Now you can run massive and execute it easily:

```javascript
var massive = require("massive");

massive.connect({
  connectionString: "postgres://localhost/massive"
}, function(err, db){
  db.productsInStock(function(err,products){
    //products is a results array
  });
});
```

You can use arguments right inline:

```sql
/* this is in db/productsBySku.sql */

select * from products
where sku=$1;
```

```javascript
var massive = require("massive");

massive.connect({
  connectionString: "postgres://localhost/massive"
}, function(err, db){
  //just pass in the sku as an argument
  db.productsBySku("XXXYYY", function(err,products){
    //products is a results array
  });
});
```

The SQL above is, of course, rather simplistic but hopefully you get the idea: *use SQL to its fullest, we'll execute it safely for you*.

## Full JSONB Document Support

Another thing I love about Postgres is the `JSONB` functionality. The queries are simple enough to write - but if you just want to encapsulate it all - we've got your back!

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

//full text search...
db.my_documents.searchDoc({
  keys : ["title", "description"],
  term : "Kauai"
}, function(err,docs){
  //docs returned with an on-the-fly Full Text Search
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

### A Word About IDs

We store IDs in their own column and treat them as a normal Primary Key. These values are **not** duplicated in the database - instead they are pulled off during writes and readded during reads.

## Helpful Relational Bits

The entire API above works the same with relational tables, just remove "Doc" from the function name (`find`, `search`, `save`);

When you run `connect` massive executes a quick `INFORMATION_SCHEMA` query and attaches each table to the main namespace (called `db` in these examples). You can use this to query your tables with a bit less noise.

The API is as close to Massive 1.0 as we could make it - but there's no need for `execute` - just run the query directly:

```javascript
//connect massive, get db instance

//find a single user by id
db.users.findOne(1, function(err,user){
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

There's more to do with the massive REPL - such as generating query files for you (if you're not accomplished at SQL just yet) as well as a better way to play with the results.

##Want to help?

If you want to contribute - I'd love it! Just open an issue to work against so you get full credit for your fork. You can open the issue first so we can discuss and you can work your fork as we go along.

The code is rather hideous - I wrote it in a fit of inspiration and if you see things that could be done better, yay!

If you see a bug, please be so kind as to show how it's failing, and I'll do my best to get it fixed quickly.

