var assert = require("assert");
var helpers = require("./helpers");
var _ = require("underscore")._;
var db;

describe("Functions Loaded from PG", function() { 
  before(function(done){
    helpers.resetDb(function(err,res){
      db = res;
      done()
    });
  });  

  describe("Loading of Functions from PG", function() { 
    it("has an all_products function attached", function (done) { 
      assert(db.all_products, "no all_products function");
      done();
    });
    it("has a schema-bound function attached to myschema", function (done) { 
      assert(db.myschema.all_albums, "no all_albums function on myschema");
      done();
    });
  });

  describe("Function Execution", function() { 
    it("executes all_products and returns the results", function (done)  {
      db.all_products(function(err,res) {
        assert.equal(res.length, 3);
        done();
      });
    });
    it("executes schema-bound function and returns the results", function (done) {
      db.myschema.all_albums(function(err,res) {
        assert.equal(res.length, 3);
        done();
      });
    });
  }); 
});