var massive = require("../index");
var util = require("util");
var _ = require("underscore")._;



massive.connect("postgres://postgres@localhost/test", function(err,db) {
//massive.connect({user : "root", password : "", database : "test"}, function(err,db) {
  console.log("err " + err)
  var dropProducts = db.dropTable("products").execute(function(err,data){
    console.log("Products table dropped");
    createProducts();
  });

  var createProducts = function(){
    var createQuery = db.createTable("products", {
      name : "string",
      price : "money",
      timestamps : true
    });
    createQuery.execute(function(err,data){
      console.log("Products table created");
      db.loadTables(function(err,_db){
        db = _db;
        insertProducts();
      });
      

    });
  };


  var insertProducts = function() {


    var items = [
      {name:"stuffy stuff", price: 12.00},
      {name:"poofy poof", price: 24.00}
    ];
    db.products.insert(items).execute(function(err,newProducts){
      console.log("Added " + newProducts.length + " products to db - here they are");
      showProducts(function(){
        updatePrices();
      });
    });

  }

  var showProducts = function(callback){
    var query = db.products.find();
    query.on("row", function(p){
      console.log(p);
    });
    query.on("end", callback)
  }

  var updatePrices = function(){
    console.log("Updating prices due to inflation");
    db.products.update({price : 100.00}, {"id >" :  0}).execute(function(err,results){
      console.log("Prices updated: " + results.rowCount);
      showProducts(function(){
        runQuery();
      });
    });
  }


  var runQuery = function(callback) {
    console.log("Running arbitrary SQL: ");
    db.run("SELECT * FROM products", "", function(err, result) {
      console.log(result);
      deleteAll();
    });
  };

  var deleteAll = function() {
    console.log("Deleting everything, outta here!");
    var query = db.products.destroy();
    query.execute(function(err,results){
      console.log("Everything toast!");
    });
  }


});






