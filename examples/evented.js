var massive = require("../lib/");
var util = require("util");
var _ = require("underscore")._;

massive.connect("postgresql://postgres@localhost/test");

var products = new massive.table("products");

//this is a query
var dropProducts = massive.dropTable("products");

var createProducts = massive.createTable("products", {
    name : "string",
    price : "money",
    timestamps : true
});


var items = [
  {name:"stuffy stuff", price: 12.00},
  {name:"poofy poof", price: 24.00}
];

var batchInsert = products.insertBatch(items);
var updatePrices = products.update({price : 100.00}, {"id >" :  0});
var select = products.all();
var destroyAll = products.destroy();

destroyAll.once("executed", function(){
  console.log("No more products!");
});

updatePrices.once("executed", function(){
  select.on("row", function(product){
    console.log(product);
  });
  select.on("end", function(){
    destroyAll.execute();
  })
})
batchInsert.once("executed", updatePrices.execute);
createProducts.once("executed", batchInsert.execute);
dropProducts.once("executed", createProducts.execute);


dropProducts.execute();
// var select = products.all();

// var items = [
//   {name:"stuffy stuff", price: 12.00},
//   {name:"poofy poof", price: 24.00}
// ];

// var batchInsert = products.insertBatch(items);
// var updatePrices = products.update({price : 100.00}, {"id >" :  0});
// var destroyAll = products.destroy();

// console.log(dropProducts);
// console.log(createProducts);
// dropProducts.once("executed", createProducts.execute);


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

// createProducts.on("executed", function(){
//   console.log("Added products table");
//   batchInsert.execute();
// });

// //start it off with dropping/creating
// dropProducts.on("executed", function(){
//   console.log("dropped products");
//   createProducts.execute();
// });


