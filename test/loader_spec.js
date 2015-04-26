var assert = require("assert");
var helpers = require("./helpers");
var db;

describe('On spin up', function () {
  
  before(function(done){
    helpers.resetDb(function(err,res){
      db = res;
      done()
    });
  });  
  it('returns a valid db interface', function () {
    assert(db && db.tables && db.queryFiles && db.connectionString);
  });
  it('loads non-public schema as namespace property', function() {
    assert(db.myschema, "No Schema loaded");
  });
  it('loads tables in db schema as properties of namespace', function() { 
    assert(db.myschema.artists && db.myschema.albums, 'No tables loaded on schema')
  });
  it('loads up 6 tables with 2 in schema object in array property', function () {
    assert.equal(db.tables.length, 8);
  });

  // including one nested in a deeper folder... total of 4 now.
  it('loads up 7 queries', function () {
    assert.equal(db.queryFiles.length, 7);
  });
  it('loads up functions', function () {
    assert.equal(db.functions.length,3)
  });
});

var syncLoaded;
var constr = "postgres://rob:password@localhost/massive";
var path = require("path");
var scriptsDir = path.join(__dirname, ".", "db");

describe('Synchronous Load', function () {
  
  it('loads the db synchronously and blocks execution until complete', function() { 
    // no need to re-set the back-end; it wasn't changed by the previous 'suite' ...
    syncLoaded = require("../index").loadSync({connectionString: constr, scripts: scriptsDir});
    assert(syncLoaded && syncLoaded.tables && syncLoaded.queryFiles && syncLoaded.connectionString);
  }); 
  it('returns a valid db instance from sync load function', function () {
    assert(syncLoaded && syncLoaded.tables && syncLoaded.queryFiles && syncLoaded.connectionString);
  });
  it('loads non-public schema as namespace property', function () {
    assert(syncLoaded.myschema, "No Schema loaded");
  });
  it('loads tables in syncLoaded schema as properties of namespace', function() { 
    assert(syncLoaded.myschema.artists && syncLoaded.myschema.albums, 'No tables loaded on schema')
  });
  it('loads up 6 tables with 2 in schema object in array property', function () {
    assert.equal(syncLoaded.tables.length, 8);
  });

  // including one nested in a deeper folder... total of 4 now.
  it('loads up 7 queries', function () {
    assert.equal(syncLoaded.queryFiles.length, 7);
  });
  it('loads up functions', function () {
    assert.equal(syncLoaded.functions.length,3)
  });
});
