var assert = require("assert");
var helpers = require("./helpers");
var db;

describe('On spin up', function () {
  before(function() {
    return helpers.resetDb('loader').then(instance => db = instance);
  });

  it('returns a valid db interface', function () {
    assert(db && db.tables && db.queryFiles && db.connectionString);
  });

  it('loads non-public schemata as namespace properties', function () {
    assert(db.one && db.two, "No schemata loaded");
  });

  it('loads schema objects with the appropriate namespacing', function (done) {
    assert(db.one.t1, 'Schema table not loaded');
    assert(db.one.v1, 'Schema view not loaded');
    assert(db.one.f1, 'schema function not loaded');

    db.one.t1.find({}, function (err) {
      assert.ifError(err);

      done();
    });
  });

  it('loads all tables', function () {
    assert.equal(db.tables.length, 6);
  });

  it('loads all views', function () {
    assert.equal(db.views.length, 6);
  });

  it('loads query files', function () {
    assert.ok(db.queryFiles.length > 0);
  });

  it('loads functions', function () {
    assert.equal(db.functions.length, 4);
  });
});
