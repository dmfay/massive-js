var assert = require("assert");
var helpers = require("./helpers");
var db;

describe('Document updates,', function(){

  before(function(done){
    helpers.resetDb(function(err, res){
      db = res;
      done();
    });
  });

// update objects set body=jsonb_set(body, '{name,last}', '', true) where id=3;
  describe("Save data and update,", function() {
    var newDoc = {};
    before(function(done) {
      db.saveDoc("doggies", {name:"Foo", score:1}, function(err, doc){
        newDoc = doc;
        done();
      });
    });
    it('creates the table', function(){
      assert(db.doggies);
    });
    it('check saved attribute', function(){
      assert.equal(1, newDoc.score);
    });
    it('updates the document', function() {
      db.doggies.updateDoc(newDoc.id, "vaccinated", true, function(err, doc){
        assert.equal(doc.vaccinated, true);
        done();
      });
    });
    it('updates the document without replacing existing attributes', function(done) {
      db.doggies.updateDoc(newDoc.id, "score", 10, function(err, doc){
        assert.equal(doc.score, 10);
        assert.equal(doc.vaccinated, true);
        assert.equal(doc.id, newDoc.id);
        done();
      });
    });

  });

});
