var assert = require("assert");
var massive = require("../index");
var helpers = require("./helpers");

describe('Connecting', function () {
  it('connects', function (done) {
    massive.connect({
      connectionString: helpers.connectionString
    }, done);
  });

  it('overrides and applies defaults', function (done) {
    massive.connect({
      connectionString: helpers.connectionString,
      defaults: {
        parseInt8: true
      }
    }, function (err, db) {
      assert.ifError(err);
      assert.equal(db.defaults.parseInt8, true);

      db.products.count({}, function (err, count) {
        assert.ifError(err);
        assert.equal(typeof count, 'number');

        done();
      });
    });
  });

  it('rejects connection blocks without a connstr or db', function (done) {
    massive.connect({
      things: 'stuff'
    }, function (err) {
      assert.equal(err.message, 'Need a connectionString or db (name of database on localhost) to connect.');

      done();
    });
  });
});
