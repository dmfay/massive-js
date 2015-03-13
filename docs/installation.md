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
