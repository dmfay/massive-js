var massive = require("../lib/massive");
var util = require("util");
var _ = require("underscore")._;

massive.connect("postgresql://postgres@localhost/test");
var products = new massive.Model("products");
//this is a query
// var dropProducts = massive.dropTable("products");

// //assign something to it for when it executes...
// dropProducts.on("executed", function(result) {
//   console.log("Products table dropped");
// });


// var select = products.all();
// select.on("row", function(row){
//   console.log(row);
// });

// var insert = products.update({price:109.00}, {"id > " : 2});
// insert.on("executed", function(newProduct){
//   console.log(newProduct);
// });

var inline = massive.run("SELECT * FROM products");
inline.on("row", function(r){
  console.log(r);
});