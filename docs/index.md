![MassiveJS](http://rob.conery.io/img/2015/03/massive-logo.png)

## What Is Massive?

Massive is a PostgreSQL-specific data access tool. The **goal** of Massive is to make it easier for you to use PostgreSQL's amazing features, *not to hide them under a load of abstraction*.

Massive is *not an ORM*. It loads your schema at runtime, creating an object instance that allows you to query tables, views, functions, and stored SQL files as if they were first-order methods:

```js
var Massive = require("massive");

//connect to the database. This will load the tables and functions, returning them to the db instance
var db = Massive.connectSync({db : "my_db"});

//query a table
db.my_table.find({name : "Joe"}, function(err,result){
  //result is returned with all records of my_table where the name is Joe
});

//run the login function
db.login(['username', password], function(err,result){
  //the login function is executed and results returned in result
});

```

You can create a directory in the root of your project called "db" and Massive will load the SQL files therein and make them executable based on file name.

For instance, if you create a file called `db/my_query.sql` and add some SQL to it:

```sql
SELECT * FROM my_table where name=$1 and city=$2;
```

This bit of SQL will be accessible now on your db instance and you can query it like this:

```js
var Massive = require("massive");
var db = Massive.connectSync({db : "my_db"});
db.my_query(['joe', 'Hanalei'], function(err,res){
  //the results are returned in the callback
});

```

This is what Massive is. It helps you access and query your database *as you want to*, embracing the goodness of SQL.
