var assert = require("assert");
var helpers = require("./helpers");
var _ = require("underscore");
var db;

describe('Functions', function () {
  before(function(done){
    helpers.resetDb('functions', function(err,res) {
      db = res;
      done();
    });
  });

  describe('loading with schema and casing', function () {
    it('loads everything', function () {
      assert(!!db.get_number);
      assert(!!db.GetNumber);
      assert(!!db.one.get_number);
      assert(!!db.one.GetNumber);
    });

    it('returns expected results', function (done) {
      db.get_number(function (err, res) {
        assert.ifError(err);
        assert.equal(res, 1);

        db.GetNumber(function (err, res) {
          assert.ifError(err);
          assert.equal(res, 2);

          db.one.get_number(function (err, res) {
            assert.ifError(err);
            assert.equal(res, 3);

            db.one.GetNumber(function (err, res) {
              assert.ifError(err);
              assert.equal(res, 4);

              done();
            });
          });
        });
      });
    });
  });

  describe('invocation and arguments passing', function () {
    it('invokes a function with no arguments', function (done) {
      db.get_number(function (err, res) {
        assert.ifError(err);
        assert.equal(res, 1);
        done();
      });
    });

    it('invokes a function with one argument directly', function (done) {
      db.single_arg(1, function (err, res) {
        assert.ifError(err);
        assert.equal(res, 1);
        done();
      });
    });

    it('invokes a function with one argument in an array', function (done) {
      db.single_arg([ 1 ], function (err, res) {
        assert.ifError(err);
        assert.equal(res, 1);
        done();
      });
    });

    it('invokes a function with multiple arguments directly', function (done) {
      db.multi_arg(1, 2, function (err, res) {
        assert.ifError(err);
        assert.equal(res, 3);
        done();
      });
    });

    it('invokes a function with multiple arguments in an array', function (done) {
      db.multi_arg([ 1, 2 ], function (err, res) {
        assert.ifError(err);
        assert.equal(res, 3);
        done();
      });
    });
  });

  describe('return types', function () {
    it('gets primitives', function (done) {
      db.get_number(function (err, res) {
        assert.ifError(err);
        assert.equal(res, 1);
        done();
      });
    });

    it('gets json', function (done) {
      db.get_json(function (err, res) {
        assert.ifError(err);
        assert(_.isObject(res));
        assert.equal(res.hello, 'world');
        done();
      });
    });

    it('gets arrays', function (done) {
      db.get_array(function (err, res) {
        assert.ifError(err);
        assert(_.isArray(res));
        assert.equal(res.length, 4);
        assert(res.every(function (e) { return e === 'yes'; }));
        done();
      });
    });

    /*
    // `pg` module doesn't support arrays of custom types yet
    // see: https://github.com/brianc/node-postgres/issues/986
    it("executes function coin_tosses and returns array of 'heads' or 'tails'", function (done) {
      db.coin_tosses(function(err,res) {
        assert.ifError(err);
        console.dir(res);
        assert(Array.isArray(res), "Expected array");
        res.forEach(function(el) {
          assert(['heads', 'tails'].indexOf(el) >= 0, "'" + el + "' must be heads or tails");
        });
        done();
      });
    });
    */

    it('gets enums', function (done) {
      db.get_enum(function (err, res) {
        assert.ifError(err);
        assert(res === 'heads' || res === 'tails');
        done();
      });
    });

    it('gets domains', function (done) {
      db.get_domain(function (err, res) {
        assert.ifError(err);
        assert.equal(res, 'example@example.com');
        done();
      });
    });

    it('gets records', function (done) {
      db.get_record(function (err, res) {
        assert.ifError(err);
        assert.equal(res.length, 1);
        assert.equal(res[0].id, 1);
        assert.equal(res[0].field1, 'two');
        assert.equal(res[0].field2, 'three');
        done();
      });
    });
  });

  describe('streaming function results', function () {
    it('executes citext-added function regexp_matches and returns stream of matches', function (done) {
      db.regexp_matches('aaaaaaaaaaaaaaaaaaaa', 'a', 'g', {stream: true}, function(err, stream) {
        assert.ifError(err);
        var result = [];

        stream.on('readable', function() {
          var res = stream.read();

          if (res) {
            result.push(res);
          }
        });

        stream.on('end', function () {
          assert.equal(20, result.length);
          result.forEach(function(r) {
            assert.equal(r, 'a');
          });
          done();
        });
      });
    });
  });
});
