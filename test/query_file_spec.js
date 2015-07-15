var assert = require("assert");
var helpers = require("./helpers");
var db;

describe('Queries built from files', function () {
  
  before(function(done) {
    helpers.resetDb(function(err,res) {
      db = res;
      done();
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
    it('executes inStockProducts with only a callback', function (done) {
      db.inStockProducts(function(err,products){
        assert.equal(2, products.length);
        done();
      });
    });

    it('executes productById with a primitive param and callback', function (done) {
      db.special.productById(1, function(err,products){
        var p1 = products[0];
        assert.equal("Product 1", p1.name);
        done();
      });
    });

    it('executes productByName with multiple params and callback', function (done) {
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

    it('streams inStockProducts without params', function (done) {
      db.inStockProducts({stream: true}, function(err, stream) {
        assert.ok(err === null);

        var result = [];

        stream.on('readable', function() {
          var res = stream.read();

          if (res) { result.push(res); }
        });

        stream.on('end', function () {
          assert.equal(2, result.length);
          done();
        });
      });
    });

    it('streams productById with a primitive param', function (done) {
      db.special.productById(1, {stream: true}, function(err, stream) {
        assert.ok(err === null);

        var result = [];

        stream.on('readable', function() {
          var res = stream.read();

          if (res) { result.push(res); }
        });

        stream.on('end', function () {
          assert.equal(1, result.length);
          done();
        });
      });
    });

    it('streams productByName with params and callback', function (done) {
      db.productByName(["Product 1", "Product 2"], {stream: true}, function(err, stream) {
        assert.ok(err === null);

        var result = [];

        stream.on('readable', function() {
          var res = stream.read();

          if (res) { result.push(res); }
        });

        stream.on('end', function () {
          assert.equal(2, result.length);
          done();
        });
      });
    });
  });
});
