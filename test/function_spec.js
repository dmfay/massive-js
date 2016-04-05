var assert = require("assert");
var helpers = require("./helpers");
var db;

describe('Functions', function() {
  before(function() {
    return helpers.resetDb().then(function(res) {
      db = res;
    });
  });
  it('executes all products', function() {
    return db.all_products().then(function(res) {
      assert(res.length > 0);
    });
  });
  it('executes all myschema.albums', function() {
    return db.myschema.all_albums().then(function(res) {
      assert(res.length > 0);
    });
  });
  it('executes artists with param', function() {
    return db.myschema.artist_by_name('AC/DC').then(function(res) {
      assert(res.length > 0);
    });
  });

  describe("Loading of Functions from PG", function() {
    it("has an all_products function attached", function() {
      assert(db.all_products, "no all_products function");
    });
    it("has a schema-bound function attached to myschema", function() {
      assert(db.myschema.all_albums, "no all_albums function on myschema");
    });
  });

  describe("Function Execution", function() {
    it("executes all_products and returns the results", function()  {
      return db.all_products().then(function(res) {
        assert.equal(res.length, 4);
      });
    });
    it("executes schema-bound function and returns the results", function() {
      return db.myschema.all_albums().then(function(res) {
        assert.equal(res.length, 3);
      });
    });
  });

  describe("Functions with Cased Names", function() {
    it("executes camel-cased function AllMyProducts and returns the results", function()  {
      return db.AllMyProducts().then(function(res) {
        assert.equal(res.length, 4);
      });
    });
    it("executes schema-bound, camel-cased function AllMyAlbums and returns the results", function() {
      return db.myschema.AllMyAlbums().then(function(res) {
        assert.equal(res.length, 3);
      });
    });
  });
});
