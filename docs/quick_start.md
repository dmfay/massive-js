## Installation

Installing Massive is a simple matter of using NPM. If you're adding Massive to a current project, just do:

```
npm install massive --save
```

One of the key features of Massive is that it loads all of your tables, Postgres functions, and local query files up as functions (this is really cool, you want this. See below for more info). Massive is fast, and does this quickly. However, there is a one-time execution penalty at intialization while all this happens. In most situations it makes sense to do this once, at application load. 

## Express Example

If you're using Express as your web server, creating an instance of Massive and storing it with your app makes good sense:

```js
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

```js
var db = app.get('db');
```

## 5 Minute Tutorial

If you want to take Massive for a test ride, you can create a node project and then add Massive to it:

```
mkdir massive-test
cd massive-test
npm init
```

Answer yes to all the defaults and then install massive:

```
npm install massive --save
```

You'll need a database to work with Massive, so let's create one quickly:

```
createdb massive-test
```

Now we need to create a table to work with. For this we'll use `psql`:

```
psql massive-test
```

You should now be connected to your database. Let's create a table:

```sql
create table users(
  id serial primary key, 
  email varchar(255) not null unique, 
  first varchar(50), 
  last varchar(50)
);

```

Quit out of `psql` with `\q` and now let's create our Node code. Create a file called "index.js" and in it, let's connect to our database and add some records:

```js
var Massive=require("massive");
var db = Massive.connectSync({db : 'massive-test'});

var newUser = {
  email : "test@test.com",
  first : "Joe",
  last : "Test"
};

db.users.save(newUser, function(err,result){
  console.log(result);  
});
```

Run this file using `node index.js` from the command line and you should see your record come back with a new ID attached! If you don't want to use a callback for this little experiment, you can also run this synchronous code:


```js
var Massive=require("massive");
var db = Massive.connectSync({db : 'massive-test'});

var newUser = {
  email : "test2@test.com",
  first : "Jill",
  last : "Test"
};

var saved = db.users.saveSync(newUser);
console.log(saved);
```

Again, you should see the new record here (be sure to change the email! We created the table with a `unique` constraint).

Now, let's pull some data out. We'll find by `id` first:

```js
var Massive=require("massive");
var db = Massive.connectSync({db : 'massive-test'});

db.users.find(1, function(err,res){
  console.log(res);
});

```

You should see Joe's record when you run the file using `node index.js`. If you wanted to run this synchronously, you could by adding `Sync` to the end of the method: `db.users.findSync`.

Now let's find by email:

```js
var Massive=require("massive");
var db = Massive.connectSync({db : 'massive-test'});

db.users.find({email : "test@test.com"}, function(err,res){
  console.log(res);
});
```

This time you'll have a slightly different result - you'll have an array. This is because when you query by primary key, Massive understands there can be only one result returned. If you query by other criteria you will have 0 or more results.

Now let's update Joe's record:

```js
var Massive=require("massive");
var db = Massive.connectSync({db : 'massive-test'});

db.users.saveSync({id: 1, email : "joe@test.com"});
var joe = db.users.findSync(1);
console.log(joe);
```

Here we're using the synchronous methods for convenience. In practice you'll want to go with Node's callback style as synchronous routines like this are blocking - and they can slow Node's thread down. For small scripts like this, however, they can be useful.

When you run this, you'll see Joe's email has now changed. We didn't need Joe's entire record - Massive built a partial update for us. But wouldn't it be useful to have Joe's record back without the additional query?

You can:

```js
var Massive=require("massive");
var db = Massive.connectSync({db : 'massive-test'});

var joe = db.users.saveSync({id: 1, email : "joe@test.com"});
console.log(joe);
```

All updates and inserts with Massive flex PostgreSQL's `RETURNING *` - which means that PostgreSQL will return the changed record to us.

Now let's delete Joe's record:
```js
var Massive=require("massive");
var db = Massive.connectSync({db : 'massive-test'});

db.users.destroy({id: 1}, function(err,res){
  console.log(res);
});

```

You should see the deleted record returned to you. Good job! You've done the basics with Massive!
