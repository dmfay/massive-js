var assert = require("assert");
var helpers = require("./helpers");
var db;

describe('Functions', function () {
  
  before(function(done){
    helpers.resetDb(function(err,res){
      db = res;
      done()
    });
  }); 
  it('executes all products', function (done) {
    db.all_products(function(err,res){
      assert(res.length > 0);
      done();
    });
  });
  it('executes all myschema.albums', function (done) {
    db.myschema.all_albums(function(err,res){
      assert(res.length > 0);
      done();
    });
  });
  it('executes artists with param', function (done) {
    db.myschema.artist_by_name('AC/DC', function(err,res){
      assert(res.length > 0);
      done();
    });
  });
});