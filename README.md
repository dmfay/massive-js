## Some Light Abstraction for Accessing Data

Massive is a data access tool for Node JS that works with relational data systems - currently Postgres and MySQL.

Massive's goal is to **help** you get data from your database. This is not an ORM, it's a bit more than a query tool - our goal is to do just enough, then get out of your way. I happen to love Sequel (the Ruby data access tool) and I've emulated that tool ... sort of... with Massive.

## The 5-Second Hi How Are Ya

Installation is the usual:

```
npm install massive
```

To work with Massive, create a connection do something interesting:

```javascript
var db = require("massive");
db.connect("postgres://postgres@localhost/mydatabase", function(err, db){
  db.myTable.each(function(thing){
    console.log(thing);
  });
});
```

You open a connection against a database (currently Postgres or MySQL) and Massive will snoop your tables using Information.Schema, and will magically "bind" those tables as properties to your db for querying:

```javascript
db.myTable.find({id : 1}).execute(function(err, thing) {
  console.log(thing);
});
```

Sometimes having all your columns returned to you isn't optimal:

```javascript
db.myTable.find({id : 1}, {columns : "name"}).execute(function(err, thing) {
  console.log(thing.name);
});
```

If you pass a column list in to find, as an array, it works too:

```javascript
db.myTable.find(["name"]).execute(function(err, thing) {
  console.log(thing.name);
});
```


Massive is highly-evented, which means you can work with events rather than callbacks:

```javascript
var allMyStuff = db.myTable.find({"id > " : 0});
allMyStuff.on("row", function(row){
  console.log(row);
});

```

By adding the "row" event, the query is triggered and you can then iterate over it. You could also use "each()" as above, and it would do the same thing. You can also listen for when the iteration is completed:

```javascript
var allMyStuff = db.myTable.find({"id > " : 0});
allMyStuff.each(function(thing){
  console.log(thing);
});

allMyStuff.on("end", function(){
  console.log("Guess that's all!")
});

```

One other event that is very handy is "executed" - this tells you when a query has completed. This works pretty nicely with the way inserts work:

```javascript
var newProduct = db.products.insert({name : "vanilla soda", price : 100});
newProduct.on("executed", db.featuredProducts.insert);
newProduct.execute();
```

Queries in Massive are independent of their execution and are little Event Vehicles (a word I made up). In this example I created a query and wired another query to go off when execution is completed. Massive "forwards" the data to any listeners on the event (in this case it's a new product record). Node then uses that bit of data as an argument to pass into the db.featuredProducts table.

You can add, edit, and delete records - which I'll show in a second - but the ultimate thing to remember is you can **always use SQL** when you need to:

```javascript
db.run("select message from freakytable where id = $1", ["la la la"], function(err, result){
  console.log("Freaky! " + result)
});
```

I like SQL and I find that by staying true to SQL rather than muscling an ORM abstraction makes life much happier. Now, on to the rest of the stuff...

## Inserts

Inserting data into your database is pretty straightforward:

```javascript
db.myTable.insert({name:"rubber ducky", message : "You're the one"}).execute(function(err,result){
  //if you're using Postgres, the new record is returned
  console.log("The new id is " + result.id);
});
```

Many times you need to insert a whole bunch of stuff:

```javascript
var items = [
  {name:"stuffy stuff", price: 12.00},
  {name:"poofy poof", price: 24.00}
];
db.myFluffyAnimals.insert(items).execute(function(err,newGuys){
  _.each(newGuys, function(err,newGuy){
    console.log("Hello there " + newGuy.name);
  });
});
```

Here I'm using Underscore.js's "each" method to roll out an array of results - all of the critters are inserted as part of a single statement, rather than one at a time.

## Updates

Updates follow the same pattern:

```javascript
db.myFluffyAnimals.update({name : "crunchy crunch"}, 2).execute(function(err,result){
  console.log("Price updated!");
});

```

This example used a single record, but you can also update more than one record:

```javascript
db.myFluffyAnimals.update({name : "crunchy crunch"}, {"id <>" : 100}).execute(function(err,result){
  console.log("Price updated!");
});

```

## Limits, Orders, etc

You can order and limit your query using a bit of a fluent interface:

```javascript
var moreThanAHundo = db.myFluffyAnimals.find({"price < ": 100}).order("name").limit(10);
moreThanAHundo.each(function(critter){
  console.log("Ahoy!")
});

```

This example uses a few new things: the `each` method on the query and the order/limit stuff in a fluent fashion. It also uses a nice readable criteria set where the operator is a string key that gets sent in.

## Deletes

Deletes are a sad thing, but often are required:

```javascript
db.myFluffyAnimals.destroy().execute(function(){
  console.log("All gone :(")
});
```

Of course, that's a bit drastic. Let's just delete a few:

```javascript
db.myFluffyAnimals.destroy({"price > " : 1000}).execute(function(){
  console.log("Expensive stuff - OUTTA HERE");
});
```

Or maybe just one?

```javascript
db.myFluffyAnimals.destroy(1).execute(function(){
  console.log("The first critter is toast");
});
```

## Schema

No self-respecting data tool would leave you without the ability to create a table!

```javascript
//a query, just like the other stuff
var sparklyCritters = db.createTable("sparkly_stuff", {
    name : 'string not null',
    price : 'money',
    birthday : 'date',
    ip : 'inet not null default '127.0.0.1'
});

sparklyCritters.execute();
```

No, "string", "money" and "date" aren't valid Postgres types (well date sorta is). These are transformed by Massive into "varchar(255)", "decimal(8,2)", and "timestamptz" for you.

The last entry is an IP address - and notice you can send in whatever you like. Massive will try and digest it.

## Examples

There's an examples directory that shows more goodies, and our tests also give a nice indication of what's possible.

## Want to help?

This is my first Node module and I'm just getting my juices flowing with Javascript. It's highly-likely that I forgot a semi-colon or maybe did something dumb. If you spot something and want to help me - yay! Please be sure to let me know why what you're doing is better so we can all learn.

If you see a bug, please be so kind as to show how it's failing, and I'll do my best to get it fixed quickly.




