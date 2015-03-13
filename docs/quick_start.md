# Quick Start Example

Let's have a quick play with Massive. We'll assume you already have Postgres installed (version 9.4 is required for `jsonb` support). If you don't, you can get it here:

 - **Mac** do yourself a favor and use [Postgres.app](http://postgresapp.com/) from the folks at Github. A fully-contained Postgres server in an app!
 - **Windows** you can [grab the executable here](http://www.postgresql.org/download/windows/). Particularly fun is just how fast it installs compared to SQL Server Express.
 - **Linux** you can just `app-get install postgres`

Now that that's done, let's get started.

## A Test Database

First thing: let's create a database called `massive`. Why not:

```
createdb massive
```

(If the above command doesn't work for you make sure the binaries for PG are in your PATH).

Now let's create a `users` table and add a single record:

```
psql massive
create table users(id serial primary key, email varchar(50), first varchar(50), last varchar(50));
insert into users(email, first, last) values ('Test', 'User', 'test@test.com');
```

Hopefully everything went off OK.

## Install Massive

Now let's create a quick working directory and install Massive:

```
mkdir massive-test && cd massive-test
touch index.js
npm install massive
```

You should now have a `node_modules` directory as well as a file called "index.js" that is completely empty. Let's edit that index.js file:

```javascript
var massive = require("massive");
//assuming you have rights to connect
massive.connect({db : "massive"}, function(err,db){
  db.users.find();
});
```

If you're on Windows the above connection might cause issues. If it does, you can use this connection instead:

```javascript
var massive = require("massive");
massive.connect({connectionString : "postgres://user:password@localhost/massive"}, function(err,db){
  db.users.find();
});
```

That's a standard connection string that you can always use instead of the more convenient one we used at first.

OK, save the file - let's run it from the command line:

```
node index.js
```

You should now see your user record output to the screen. Something to notice here is that you didn't need to pass a callback to the function - a feature we added so you could play around with your code and see what comes back. We'll do more of this in a second.


## Add a SQL File

Let's create a directory and add a SQL file:

```
mkdir db
touch db\allUsers.sql
```

You should now have an empty SQL file in your db directory. Let's edit it:

```sql
select first || ' ' || last as "fullName", email from users;
```

Save it. Now let's edit our `index.js` file:

```javascript
var massive = require("massive");
massive.connect({connectionString : "postgres://user:password@localhost/massive"}, function(err,db){
  db.allUsers();
});
```

And now we can run it..

```
node index.js
```

You should see the results of your query on screen.

## A Simple Document

With the same `index.js` document open, let's have some fun with `jsonb`:

```javascript
var massive = require("massive");

var newUser = {
  email : "test@test.com",
  first : "Jill",
  last : "User"
};

massive.connect({connectionString : "postgres://user:password@localhost/massive"}, function(err,db){
  db.saveDoc("user_docs", newUser, function(err,res){
    console.log(res);
  });
});
```

Run this file again using `node index.js` and you should see a new user with an `id` of 1. Nice work!

Now let's have a little fun - let's run a Full Text search on our new `jsonb` table:

```javascript
var massive = require("massive");

massive.connect({connectionString : "postgres://user:password@localhost/massive"}, function(err,db){
  db.user_docs.searchDoc({
    keys : ['email', 'first', 'last'],
    term : 'test'
  }, function(err,users){
    console.log(users);
  });
});
```

You now have access to your new table `user_docs` right on the massive root namespace `db`, and you can use the `searchDoc` method to create a full-text query on the fly. Here we just tell Massive the keys we want to search over as well as the term.

You should see our test user when you run this file with `node index.js`.

