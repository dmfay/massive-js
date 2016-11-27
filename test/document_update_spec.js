var assert = require("assert");
var helpers = require("./helpers");

describe('Document updates,', function(){
  var db;

  before(function(){
    return helpers.resetDb().then(instance => db = instance);
  });

  // update objects set body=jsonb_set(body, '{name,last}', '', true) where id=3;
  describe("Save data and update,", function() {
    var newDoc = {};
    var array = [1,2,3];
    before(function(done) {
      db.saveDoc("docs", {name:"Foo", score:1}, function(err, doc){
        assert.ifError(err);
        newDoc = doc;
        done();
      });
    });

    it('check saved attribute', function(){
      assert.equal(1, newDoc.score);
    });

    it('updates the document', function(done) {
      db.docs.setAttribute(newDoc.id, "vaccinated", true, function(err, doc){
        assert.ifError(err);
        assert.equal(doc.vaccinated, true);
        done();
      });
    });

    it('updates the document when passed array value', function(done) {
      db.docs.setAttribute(newDoc.id, "array", array, function(err, doc){
        assert.ifError(err);
        assert.deepEqual(doc.array, array);
        done();
      });
    });

    it('updates the document without replacing existing attributes', function(done) {
      db.docs.setAttribute(newDoc.id, "score", 99, function(err, doc){
        assert.ifError(err);
        assert.equal(doc.score, 99);
        assert.equal(doc.vaccinated, true);
        assert.equal(doc.id, newDoc.id);
        assert.deepEqual(doc.array, array);
        done();
      });
    });

    it('escapes values properly', function(done) {
      db.docs.setAttribute(newDoc.id, "field", "value", function(err, doc){
        assert.ifError(err);
        assert.equal(doc.score, 99);
        assert.equal(doc.vaccinated, true);
        assert.equal(doc.field, 'value');
        assert.equal(doc.id, newDoc.id);
        assert.deepEqual(doc.array, array);
        done();
      });
    });

    after(function (done) {
      db.docs.destroy({id: newDoc.id}, done);
    });
  });
});
