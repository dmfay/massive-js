var massive = require("../lib/");
var util = require("util");
var _ = require("underscore")._;

massive.connect("postgresql://postgres@localhost/test");
var products = new massive.Model("products");
//this is a query
var dropProducts = massive.dropTable("products");
var createProducts = massive.createTable("products", {
    name : "string",
    price : "money",
    timestamps : true
});

var select = products.all();

var items = [
  {name:"stuffy stuff", price: 12.00},
  {name:"poofy poof", price: 24.00}
];

var batchInsert = products.insertBatch(items);
var updatePrices = products.update({price : 100.00}, {"id >" :  0});
var destroyAll = products.destroy();


// destroyAll.on("executed", function(){
//   console.log("No more products...");
// });

// updatePrices.on("executed", function(){
//   destroyAll();
// })

// batchInsert.on("executed", function(){
//   listProducts(function(){
//     updatePrices.execute();
//   });
// })

createProducts.on("executed", function(){
  console.log("Added products table");
  batchInsert.execute();
});

//start it off with dropping/creating
dropProducts.on("executed", function(){
  console.log("dropped products");
  createProducts.execute();
});

createProducts.execute();

var listProducts = function(){
  console.log("Product list")
  //you could also use products.all()
  var inline = massive.run("SELECT * FROM products");
  inline.on("row", function(r){
    console.log(r);
  });
}
