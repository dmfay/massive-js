var assert = require("assert");
var helpers = require("./helpers");
var db;

describe('Document attribute manipulation,', function(){

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
    it('updates the document attribute', function(done) {
      db.doggies.setAttribute(newDoc.id, "vaccinated", true, function(err, doc){
        assert.equal(doc.vaccinated, true);
        done();
      });
    });
    it('updates the document attribute without overwriting', function(done) {
      db.doggies.setAttribute(newDoc.id, "score", 99, function(err, doc){
        assert.equal(doc.score, 99);
        assert.equal(doc.vaccinated, true);
        assert.equal(doc.id, newDoc.id);
        done();
      });
    });
    it('updates the document attribute using sync method', function(done) {
      var doc = db.doggies.setAttributeSync(newDoc.id, "score", 101);
        assert.equal(doc.score, 101);
        assert.equal(doc.id, newDoc.id);
        done();
    });

  });

});
