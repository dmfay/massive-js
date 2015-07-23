var assert = require("assert");
var helpers = require("./helpers");
var db;
var _ = require("underscore")._;

describe('Functions', function () {
  before(function(done){
    helpers.resetDb(function(err,res){
      db = res;
      done()
    });
  }); 
  it('executes all products', function (done) {
    db.all_products(function(err,res){
      assert(res.length > 0);
      done();
    });
  });
  it('executes all myschema.albums', function (done) {
    db.myschema.all_albums(function(err,res){
      assert(res.length > 0);
      done();
    });
  });
  it('executes artists with param', function (done) {
    db.myschema.artist_by_name('AC/DC', function(err,res){
      assert(res.length > 0);
      done();
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
        assert.equal(res.length, 4);
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

  describe("Functions with Cased Names", function() { 
    it("executes camel-cased function AllMyProducts and returns the results", function (done)  {
      db.AllMyProducts(function(err,res) {
        assert.equal(res.length, 4);
        done();
      });
    });
    it("executes schema-bound, camel-cased function AllMyAlbums and returns the results", function (done) {
      db.myschema.AllMyAlbums(function(err,res) {
        assert.equal(res.length, 3);
        done();
      });
    });
  }); 

});