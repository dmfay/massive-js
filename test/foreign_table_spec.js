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

  it('loads foreign tables', function (done) {
      assert.ok(db.foreigntable);
      done();
  });

  it('queries foreign tables', function (done) {
    db.foreigntable.find({}, function (err, res) {
      assert.ifError(err);
      assert.equal(res.length, 0);

      done();
    });
  });

  it('sees updated information in foreign tables', function (done) {
    db.t1.insert({id: 1}, function () {
      db.foreigntable.find({}, function (err, res) {
        assert.ifError(err);
        assert.equal(res.length, 1);
        assert.equal(res[0].id, 1);

        done();
      });
    });
  });

  it('cannot save to foreign tables', function (done) {
    db.foreigntable.save({id: 1}, function (err) {
      assert.equal(err.message, 'No primary key, use insert or update to write to this table');

      done();
    });
  });

  it('cannot use the single-object update with foreign tables', function (done) {
    db.foreigntable.update({id: 1}, function (err) {
      assert.equal(err.message, 'No primary key, use the (criteria, updates) signature');

      done();
    });
  });
});
