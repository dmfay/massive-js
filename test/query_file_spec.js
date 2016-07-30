var _ = require("underscore");
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
        assert.ifError(err);
        var p1 = products[0];
        assert.equal("Product 1", p1.name);
        done();
      });
    });

    it('executes productByName with multiple params and callback', function (done) {
      db.productByName(["Product 1", "Product 2"], function(err,products){
        assert.ifError(err);
        var p1 = products[0];
        var p2 = products[1];
        assert.equal("Product 1", p1.name);
        assert.equal("Product 2", p2.name);
        done();
      });
    });

    it('executes a deep namespaced query', function (done) {
      db.queries.users.allUsers(function(err,users){
        assert.ifError(err);
        assert.equal(1, users.length);
        done();
      });
    });

    it('streams inStockProducts without params', function (done) {
      db.inStockProducts({stream: true}, function(err, stream) {
        assert.ifError(err);

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
        assert.ifError(err);

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
        assert.ifError(err);

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

  describe('Passing multiple arguments', function () {
    it('executes multiple args without passing as array', function (done) {
      db.multiple_args(1, 2, 3, 4, 5, 6, function(err,res){
        assert.ifError(err);
        assert(res.length === 1);
        var record = res[0];
        _.each([1, 2, 3, 4, 5, 6], function (idx) {
          assert(record["a" + idx] === idx);
        });
        done();
      });
    });

    it('executes multiple args with passing as array', function (done) {
      db.multiple_args([1, 2, 3, 4, 5, 6], function(err,res){
        assert.ifError(err);
        assert(res.length === 1);
        var record = res[0];
        _.each([1, 2, 3, 4, 5, 6], function (idx) {
          assert(record["a" + idx] === idx);
        });
        done();
      });
    });

    it('executes multiple args without passing as an array and using options', function (done) {
      db.multiple_args(1, 2, 3, 4, 5, 6, { this_is_ignored: true }, function(err,res){
        assert.ifError(err);
        assert(res.length === 1);
        var record = res[0];
        _.each([1, 2, 3, 4, 5, 6], function (idx) {
          assert(record["a" + idx] === idx);
        });
        done();
      });
    });

    it('executes multiple args with passing as an array and using options', function (done) {
      db.multiple_args([1, 2, 3, 4, 5, 6], { this_is_ignored: true }, function(err,res){
        assert.ifError(err);
        assert(res.length === 1);
        var record = res[0];
        _.each([1, 2, 3, 4, 5, 6], function (idx) {
          assert(record["a" + idx] === idx);
        });
        done();
      });
    });
  });
});
