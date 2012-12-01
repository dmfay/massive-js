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
  }).execute();


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

  updatePrices.once("executed", function(){
    select.on("row", function(product){
      console.log(product);
    });

  });
  
  select.on("end", destroyAll.execute);
  batchInsert.once("executed", updatePrices.execute);
  createProducts.once("executed", batchInsert.execute);
  dropProducts.once("executed", createProducts.execute);


  dropProducts.execute();


});

