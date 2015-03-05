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
    assert(db && db.tables && db.queries && db.connectionString);
  });
  it('loads up 3 tables', function () {
    assert.equal(db.tables.length, 3);
  });

  // including one nested in a deeper folder... total of 4 now.
  it('loads up 6 queries', function () {
    assert.equal(db.queries.length, 6);
  });

});
