var assert = require("assert");
var helpers = require("./helpers");
var db;

describe('Queries built from files', function () {
  
  before(function(done){
    helpers.resetDb(function(err,res){
      db = res;
      done()
    });
  });  
  describe('Loading of queries', function () {
    it('returns a db', function () {
      assert(db, "No db");
    });
    it('has a schema query attached', function () {
      assert(db.schema, "No schema query");
    });
    it('has an inStockProducts query attached', function () {
      assert(db.inStockProducts, "Not there");
    });
  });
  describe('Execution', function () {
    it('executes inStockProducts without args with only a callback', function (done) {
      db.inStockProducts(function(err,products){
        assert.equal(2, products.length);
        done();
      });
    });
    it('executes productById with non-array arg and callback', function (done) {
      db.special.productById(1, function(err,products){
        var p1 = products[0];
        assert.equal("Product 1", p1.name);
        done();
      });
    });
    it('executes productByName with multiple args and callback', function (done) {
      db.productByName(["Product 1", "Product 2"], function(err,products){
        var p1 = products[0];
        var p2 = products[1];
        assert.equal("Product 1", p1.name);
        assert.equal("Product 2", p2.name);
        done();
      });
    });
    it('executes a deep namespaced query', function (done) {
      db.queries.users.allUsers(function(err,users){
        assert.equal(1, users.length);
        done();
      });
    });
  });

});
