# MassiveJS 2.0

*This is the repository for MassiveJS 2.0. If you're looking for < 2, [you can find it here](https://github.com/robconery/massive-js/releases/tag/1.0)*

Massive's goal is to **help** you get data from your database. This is not an ORM, it's a bit more than a query tool - our goal is to do just enough, then get out of your way. [I'm a huge fan of Postgres](http://rob.conery.io/category/postgres/) and the inspired, creative way you can use it's modern SQL functionality to work with your data.

ORMs abstract this away, and it's silly. Postgres is an amazing database with a rich ability to act as a document storage engine (using `jsonb`) as well as a cracking relational engine.

Massive embraces SQL completely, and helps you out when you don't feel like writing another mundane `select * from` statement.

## Highlights

Massive allows you to use SQL with Postgres to its fullest extent. Whether it's a relational query or a document-based one with `jsonb` - Massive will help you.

### SQL Files as Executable Queries ###

Massive allows you to define a directory in your project (by default `/db`) where you can drop SQL files. When your app starts, Massive will read these SQL files and allow you to access them as executable functions.

For instance, if you create a file called `allUsers.sql` and drop it in your `/db/` directory, you can now do this:

```javascript
db.allUsers(function(err,users){
  //you have the result of the query here
});
```

### Full JSONB Support ###

A great way to build your application is to not worry about SQL schemas until you have to... and sometimes you don't ever have to! Not with Postgres anyway. You can work with JSONB documents easily:

```javascript
var newUser = {email : 'test@test.com', first : 'Test', last: 'User'};
db.saveDoc("users", newUser , function(err,user){
  //the new user is here with an ID
});
```

The code above does two things: 1) Creates a `users` table with a `jsonb` body column and 2) indexes it using `GIN` so you can have fast, scalable queries like this one:

```javascript
db.users.findDoc({email : 'test@test.com'}, function(err,res){
  //res is the result
});
```

