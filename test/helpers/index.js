var massive = require("../../index");
var connectionString = "postgres://rob:password@localhost/massive";
var assert = require("assert");
var path = require("path");
var scriptsDir = path.join(__dirname, "..", "db");

exports.connectionString = connectionString;

exports.init = function(next){
  massive.connect({
    connectionString : connectionString, 
    scripts : scriptsDir}, next);
};

exports.resetDb = function(next){
  this.init(function(err,db){
    assert(!err,err);
    db.schema(function(err, res){
      assert(!err,err);
      next(null, db);
    });
  });
};

var doc1 = {
  title : "A Document",
  price : 22.00,
  description : "lorem ipsum etc",
  is_good : true,
  created_at : new Date()
};
var doc2 = {
  title : "Another Document",
  price : 18.00,
  description : "Macaroni and Cheese",
  is_good : true,
  created_at : new Date()
};
var doc3 = {
  title : "Starsky and Hutch",
  price : 6.00,
  description : "Two buddies fighting crime",
  is_good : false,
  created_at : new Date()
};

