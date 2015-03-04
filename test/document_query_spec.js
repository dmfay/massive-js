var assert = require("assert");
var helpers = require("./helpers");
var db;

describe('Document queries', function () {
  
  before(function(done){
    helpers.resetDb(function(err,res){
      db = res;
      done()
    });
  });  
  it('returns a db', function () {
    assert(db, "No db");
  });
  describe('Querying documents', function () {
    it('finds a doc by primary key', function (done) {
      db.docs.findDoc(1, function(err,doc){
        assert.equal(doc.id, 1);
        done();
      });
    });
    it('finds a doc by title', function (done) {
      db.docs.findDoc({title : "A Document"}, function(err,docs){
        //find will return multiple if id not specified... confusing?
        assert.equal(docs[0].title, "A Document");
        done();
      });
    });
    it('parses greater than with two string defs', function (done) {
      db.docs.findDoc({"price >" : "18"}, function(err,docs){
        assert.equal(docs[0].title, "A Document");
        done();
      });
    });
    it('parses greater than with a numeric', function (done) {
      db.docs.findDoc({"price >" : 18}, function(err,docs){
        assert.equal(docs[0].title, "A Document");
        done();
      });
    });
    it('parses less than with a numeric', function (done) {
      db.docs.findDoc({"price <" : 18}, function(err,docs){
        assert.equal(docs[0].title, "Starsky and Hutch");
        done();
      });
    });
    it('deals with arrays using IN', function (done) {
      db.docs.findDoc({"price" : [18, 6]}, function(err,docs){
        assert.equal(docs.length, 2);
        done();
      });
    });
    it('deals with arrays using NOT IN', function (done) {
      db.docs.findDoc({"price <>" : [18, 6]}, function(err,docs){
        assert.equal(docs.length, 1);
        done();
      });
    });
    it('executes a contains if passed an array of objects', function (done) {
      db.docs.findDoc({studios : [{name : "Warner"}]}, function(err,docs){
        assert.equal(docs.length, 1);
        done();
      });
    });
    it('works properly with dates', function (done) {
      db.docs.findDoc({"created_at <" : new Date(1980, 1,1)}, function(err,docs){
        assert.equal(docs.length, 1);
        done();
      });
    });
  });
  describe('Full Text Search', function () {
    it('works on single key', function (done) {
      db.docs.searchDoc({
        keys : ["title"],
        term : "Starsky"
      }, function(err, docs){
        assert.equal(1, docs.length);
        done();
      });
    });
    it('works on multiple key', function (done) {
      db.docs.searchDoc({
        keys : ["title", "description"],
        term : "Starsky"
      }, function(err, docs){
        assert.equal(1, docs.length);
        done();
      });
    });
  });
});