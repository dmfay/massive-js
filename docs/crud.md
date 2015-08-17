*Note: each of the methods below has a synchronous counterpart which you can use by appending "Sync" to the method name (e.g. saveSync)*

## Insert

You can add data to your table by using `insert()` or `save()` on the table instance:

```js
//single record
db.products.insert({sku : "TEST", name : "My Product", price : 12.00}, function(err,res){
  //full product with new id returned
});

//bulk insert using an array
db.products.insert([{name: "A Product"}, {name: "Another Product"}], function (err, res) {
  //results returned as array
});
```

You can also use `save()`, provided that there is no primary key field present. When Massive loads your tables, it notes which columns are primary keys. If you pass that field to the `save()` method, Massive will assume it's an update. Otherwise it will be treated like an insert:

```js
db.products.save({sku : "TEST", name : "My Product", price : 12.00}, function(err,res){
  //full product with new id returned
});
```

## Update

You can update your table directly, running a partial update as specified:

```js
//up the price to $15
db.products.update({id : 1, price : 15.00}, function(err,res){
  //full product with new id returned
});

//does the same thing since we're passing id, which is the PK
db.products.save({id : 1, price : 15.00}, function(err,res){
  //full product with new id returned
});

//updates multiple products
db.products.update({in_stock: true}, {in_stock: false}, function(err, res) {
  //all updated products returned
});

//using an IN list
db.products.update({id: [1, 2]}, {price: 123.45}, function(err, res) {
  //all updated products returned
});

//using a NOT IN list
db.products.update({'id !=': [1, 2]}, {price: 543.21}, function(err, res) {
  //all updated products returned
});
```


## Destroying Data

Just use the `destroy` method, specifying the criteria you want deleted:

```js
db.products.destroy({id : 1}, function(err,res){
  //destroyed record is returned
});
db.products.destroy({category_id : 1}, function(err,res){
  //all records with category id 1 deleted
});
```


