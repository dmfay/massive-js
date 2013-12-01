var massive = require("../index");
var util = require("util");
var _ = require("underscore")._;

massive.connect("postgres://postgres@localhost/test", function(err, db){
//massive.connect({user : "rob", password : "", database : "test"}, function(err,db) {

  var dropProducts = db.dropTable("products");

  var createProducts = db.createTable("products", {
      name : "string",
      price : "money",
      timestamps : true
  });

  var items = [
    {name:"stuffy stuff", price: 12.00},
    {name:"poofy poof", price: 24.00}
  ];

  var batchInsert = db.products.insert(items);
  var updatePrices = db.products.update({price : 100.00}, {"id >" :  0});
  var select = db.products.find();
  var destroyAll = db.products.destroy();

  destroyAll.once("executed", function(){
    console.log("No more products!");
  });

  // jatten 11/30/2013: This is needed to be able to remove listener for "row":
  var logProduct = function(product) {
    console.log(product);
  }

  updatePrices.once("executed", function(){
    console.log("Prices went up!!");
    select.on("row", logProduct);
  });

  batchInsert.once("executed", function(){
    console.log("Fresh, new records!");
    select.on("row", logProduct);

    // jatten 11/30/2013: If we don't remove the listener, output is doubled
    // when we update. There's probably a better way...
    select.on("end", function() {
      select.removeListener("row", logProduct);
    });
  });
  
  select.on("end", destroyAll.execute);
  batchInsert.once("executed", updatePrices.execute);
  createProducts.once("executed", batchInsert.execute);
  dropProducts.once("executed", createProducts.execute);


  dropProducts.execute();


});

