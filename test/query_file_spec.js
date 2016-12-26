const _ = require("underscore");
const assert = require("chai").assert;

describe('Queries built from files', function () {
  var db;

  before(function() {
    return resetDb().then(instance => db = instance);
  });

  describe('Loading of queries', function () {
    it('has an inStockProducts query attached', function () {
      assert(db.inStockProducts, "Not there");
    });
  });

  describe('Execution', function () {
    it('executes a function with no arguments', function () {
      return db.inStockProducts().then(products => {
        assert.equal(2, products.length);
      });
    });

    it('executes a function with options', function () {
      return db.inStockProducts({ignoreme: true}).then(products => {
        assert.equal(2, products.length);
      });
    });

    it('executes a function with an argument', function () {
      return db.special.productById(1).then(products => {
        assert.equal("Product 1", products[0].name);
      });
    });

    it('executes a function with an argument and options', function () {
      return db.special.productById(1, {ignoreme: true}).then(products => {
        assert.equal("Product 1", products[0].name);
      });
    });

    it('executes a function with multiple arguments', function () {
      return db.productByName("Product 1", "Product 2").then(products => {
        assert.equal("Product 1", products[0].name);
        assert.equal("Product 2", products[1].name);
      });
    });

    it('executes a function with multiple arguments and options', function () {
      return db.productByName("Product 1", "Product 2", {ignoreme: true}).then(products => {
        assert.equal("Product 1", products[0].name);
        assert.equal("Product 2", products[1].name);
      });
    });

    it('executes a deep namespaced query', function () {
      return db.queries.users.allUsers().then(users => {
        assert.equal(1, users.length);
      });
    });

    it('streams inStockProducts without params', function (done) {
      db.inStockProducts({stream: true}).then(stream => {
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
      db.special.productById(1, {stream: true}).then(stream => {
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
      db.productByName(["Product 1", "Product 2"], {stream: true}).then(stream => {
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
