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
  it('loads up 5 tables with 2 in schema object in array property', function () {
    assert.equal(db.tables.length, 5);
  });

  // including one nested in a deeper folder... total of 4 now.
  it('loads up 7 queries', function () {
    assert.equal(db.queryFiles.length, 7);
  });
  it('loads up functions', function () {
    assert.equal(db.functions.length,2)
  });
});
