*Note: each of the methods below has a synchronous counterpart which you can use by appending "Sync" to the method name (e.g. saveSync)*

## Insert

You can add data to your table by using `insert()` or `save()` on the table instance:

```js
//single record
db.products.insert({sku: "TEST", name: "My Product", price: 12.00}, function(err, res){
  //full product with new id returned
});

//bulk insert using an array
db.products.insert([{name: "A Product"}, {name: "Another Product"}], function (err, res) {
  //results returned as array
});
```

## Update

You can update your table directly, running a partial update as specified:

```js
//up the price to $15
db.products.update({id: 1, price: 15.00}, function(err, res){
  //full product with new id returned
});

//does the same thing since we're passing id, which is the PK
db.products.save({id: 1, price: 15.00}, function(err, res){
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

## Upsert

Instead of invoking `insert()` and `update()` separately you can use the `save()` method to cover both cases. When Massive loads your tables, it notes which columns are primary keys. If a primary key column is included in the data passed to `save()`, whether in object or array form, Massive will assume the call is an update for an existing row or rows identified by that primary key. Otherwise it will emit an insert and add new rows.

`save()` may be invoked on an Array of _new_ objects just like `insert()`, in which case it will return the result as an Array. Using `save()` to update an Array of objects is not supported; you should use `update()` with criteria or an `IN` list instead.

```js
db.products.save({sku: "TEST", name: "My Product", price: 12.00}, function(err, res) {
  //full product with new id returned
});

db.products.save({id: 1, price: 13.00}, function(err, res) {
  //assuming this is the product from the previous call, returns that product with an id of 1 and an updated price of 13.00
});

db.products.save([{sku: "TEST", name: "My Product", price: 12.00}, {sku: "SAMPLE", name: "Another Product", price: 6.00}], function(err, res) {
  //array containing both products returned
});
```

## Destroying Data

Just use the `destroy` method, specifying the criteria you want deleted. Any records removed are passed to the callback in an Array. `destroy()` will never return a single object.

```js
db.products.destroy({id: 1}, function(err, res){
  //Array containing the destroyed record is returned
});

db.products.destroy({category_id: 1}, function(err, res){
  //Array containing all now-deleted records with category id 1 returned
});
```
