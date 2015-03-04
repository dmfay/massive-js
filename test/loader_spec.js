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

  it('loads up 3 queries', function () {
    assert.equal(db.queries.length, 3);
  });

});