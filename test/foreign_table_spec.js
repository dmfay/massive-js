var assert = require("assert");
var helpers = require("./helpers");
var db;

describe('Loading entities (these tests may be slow!)', function () {
  before(function (done) {
    helpers.resetDb('loader', function (err, res) {
      db = res;
      done();
    });
  });

  it('queries foreign tables', function (done) {
    db.foreigntable.find({}, function (err, res) {
      assert.equal(res.length, 0);

      done();
    });
  });

  it('sees updated information in foreign tables', function (done) {
    db.t1.insert({id: 1}, function () {
      db.foreigntable.find({}, function (err, res) {
        assert.equal(res.length, 1);
        assert.equal(res[0].id, 1);

        done();
      });
    });
  });
});
