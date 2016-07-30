var path = require("path");
var assert = require("assert");
var helpers = require("./helpers");
var db;

describe('On spin up', function () {
  before(function(done) {
    helpers.resetDb('loader', function(err,res) {
      db = res;
      done();
    });
  });

  it('returns a valid db interface', function () {
    assert(db && db.tables && db.queryFiles && db.connectionString);
  });

  it('loads non-public schemata as namespace properties', function() {
    assert(db.one && db.two, "No schemata loaded");
  });

  it('loads tables in db schema as properties of namespace', function() {
    assert(db.one.t1, 'Schema table not loaded');
    assert(db.one.v1, 'Schema view not loaded');
    assert(db.one.f1, 'schema function not loaded');
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


describe('Synchronous Load', function () {
  // no need to re-set the back-end; it wasn't changed by the previous 'suite' ...
  var syncLoaded;

  it('loads the db synchronously and blocks execution until complete', function() {
    syncLoaded = require("../index").loadSync({
      connectionString: helpers.connectionString,
      scripts: path.join(__dirname, '.', 'db')
    });

    assert(syncLoaded && syncLoaded.tables && syncLoaded.queryFiles && syncLoaded.connectionString);
  });

  it('returns a valid db instance from sync load function', function () {
    assert(syncLoaded && syncLoaded.tables && syncLoaded.queryFiles && syncLoaded.connectionString);
  });

  it('loads non-public schemata as namespace properties', function() {
    assert(syncLoaded.one && syncLoaded.two, "No schemata loaded");
  });

  it('loads tables in db schema as properties of namespace', function() {
    assert(syncLoaded.one.t1, 'Schema table not loaded');
    assert(syncLoaded.one.v1, 'Schema view not loaded');
    assert(syncLoaded.one.f1, 'schema function not loaded');
  });

  it('loads all tables', function () {
    assert.equal(syncLoaded.tables.length, 6);
  });

  it('loads all views', function () {
    assert.equal(syncLoaded.views.length, 6);
  });

  it('loads query files', function () {
    assert.ok(syncLoaded.queryFiles.length > 0);
  });

  it('loads functions', function () {
    assert.equal(db.functions.length, 4);
  });
});
