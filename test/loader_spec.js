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
  it('loads up 4 tables', function () {
    assert.equal(db.tables.length, 4);
  });

  // including one nested in a deeper folder... total of 4 now.
  it('loads up 7 queries', function () {
    assert.equal(db.queryFiles.length, 7);
  });

});
