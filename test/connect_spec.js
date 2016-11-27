var assert = require("chai").assert;
var massive = require("../index");
var helpers = require("./helpers");

describe('Connecting', function () {
  before(function() {
    return helpers.resetDb('loader');
  });

  it('connects', function () {
    return massive.connect(
      {
        connectionString: helpers.connectionString,
        scripts: `${__dirname}/db`
      }
    ).then(db => {
      assert.isOk(db);

      return Promise.resolve();
    });
  });

  it('overrides and applies defaults', function (done) {
    massive.connect({
      connectionString: helpers.connectionString,
      scripts: `${__dirname}/db`,
      defaults: {
        parseInt8: true
      }
    }).then(db => {
      assert.equal(db.defaults.parseInt8, true);

      db.t1.count({}, function (err, count) {
        assert.ifError(err);
        assert.equal(typeof count, 'number');

        done();
      });
    });
  });

  it('rejects connection blocks without a connstr or db', function () {
    return massive.connect({
      things: 'stuff'
    }).then(() => {
      assert.fail();
    }).catch(err => {
      assert.equal(err.message, 'Need a connectionString or db (name of database on localhost) to connect.');
    });
  });
});
