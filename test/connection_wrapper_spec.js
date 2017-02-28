var assert = require("assert");
var helpers = require("./helpers");
var db;

describe('connectionWrapper', function () {
  before(function(done){
    var self = this;
    helpers.resetDb('connection_wrapper', function(err,res){
      db = res;
      db.query("select current_setting('server_version_num')", function(err, res) {
        if (err) return done(err);
        self.enableRLSTest = parseInt(res[0].current_setting, 10) >= 90500;
        done();
      });
    });
  });

  describe('row level security', function() {

    function alwaysRollback(pgClient, next, done) {
      var error = null;
      pgClient.query('begin', function(err) {
        error = error || err;
        next(error, pgClient, function (err) {
          var args = Array.prototype.slice.call(arguments);
          pgClient.query('rollback;', function(err2) {
            args[0] = err || err2;
            done.apply(null, args);
          });
        });
      });
    }

    function connectionWrapperForUserId(userId) {
      if (typeof userId !== 'number') {
        throw new Error("connectionWrapperForUserId: userId must be an integer");
      }
      return function (pgClient, next, done) {
        var error = null;
        pgClient.query('begin', function(err) {
          error = error || err;
          pgClient.query('set local role massive_users', function(err) {
            error = error || err;
            pgClient.query("select set_config('claims.user_id', $1, true)", [userId], function(err) {
              error = error || err;
              next(error, pgClient, function (err) {
                var args = Array.prototype.slice.call(arguments);
                pgClient.query(err ? 'rollback;' : 'commit;', function(err2) {
                  args[0] = args[0] || err2;
                  done.apply(null, args);
                });
              });
            });
          });
        });
      };
    }

    describe('with alwaysRollback connection wrapper', function() {
      it('adds a product, but rolls back', function (done) {
        db.withConnectionWrapper(alwaysRollback).products.save({name : "Gibson Les Paul", description : "Lester's brain child", price : 3500}, function(err, res){
          assert.ifError(err);
          assert.ok(res.id);
          db.products.find(res.id, function(err, res) {
            assert.ifError(err);
            assert(!res, "Expected record not to exist (rollback)");
            done();
          });
        });
      });
    });

    describe('add RLS record - without connectionWrapper', function() {
      it('adds a product ', function (done) {
        if (!this.enableRLSTest) {
          return this.skip("Skipped - PG version doesn't support RLS");
        }
        db.products_with_rls.save({name : "Gibson Les Paul", description : "Lester's brain child", price : 3500}, function(err, res){
          assert.ifError(err);
          assert.equal(res.id, 1);
          done();
        });
      });
    });

    describe('add RLS record - with connection wrapper and allowed details', function() {
      it('adds a product ', function (done) {
        if (!this.enableRLSTest) {
          return this.skip("Skipped - PG version doesn't support RLS");
        }
        db.withConnectionWrapper(connectionWrapperForUserId(1)).products_with_rls.save({name : "Gibson Les Paul", description : "Lester's brain child", price : 3500}, function(err, res){
          assert.ifError(err);
          assert.equal(res.id, 2);
          done();
        });
      });
    });

    describe('add RLS record - with connection wrapper and forbidden details', function() {
      it('add a product DENIED', function (done) {
        if (!this.enableRLSTest) {
          return this.skip("Skipped - PG version doesn't support RLS");
        }
        db.withConnectionWrapper(connectionWrapperForUserId(2)).products_with_rls.save({name : "Gibson Les Paul", description : "Lester's brain child", price : 3500}, function(err){
          assert.ok(err);
          done();
        });
      });
    });
  });
});
