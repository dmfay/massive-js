var assert = require("assert");
var helpers = require("./helpers");
var db;

describe('Document saves', function () {
  
  before(function(done){
    helpers.resetDb(function(err,res){
      db = res;
      done()
    });
  });  

  describe("To a non-existent table", function () {
    var newDoc = {};
    before(function(done){
      db.saveDoc("doggies", {name : "Fido", age : 10}, function(err,doc){
        newDoc = doc;
        done();
      });
    });
    it('creates the table', function () {
      assert(db.doggies);
    });
    it('returns the doc', function () {
      assert.equal("Fido", newDoc.name);
    });
    after(function(done){
      db.query("DROP TABLE doggies;", function(err,res){
        done();
      });
    })

  });

});