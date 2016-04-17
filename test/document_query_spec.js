var assert = require("assert");
var helpers = require("./helpers");
var db;

describe('Document queries', function () {

  before(function(done){
    helpers.resetDb(function(err,res){
      db = res;
      done();
    });
  });

  it('returns a db', function () {
    assert(db, "No db");
  });

  describe('Querying all documents', function () {
    it('returns all documents when passed "*"', function (done) {
      db.docs.findDoc("*", function(err,res){
        assert.ifError(err);
        assert.equal(res.length, 3);
        done();
      });
    });

    it('returns all documents when passed only "next" function', function (done) {
      db.docs.findDoc(function(err,res){
        assert.ifError(err);
        assert.equal(res.length, 3);
        done();
      });
    });
  });

  describe('Querying documents by primary key', function () {
    it('finds a doc by an integer primary key', function (done) {
      db.docs.findDoc(1, function(err,doc){
        assert.ifError(err);
        assert.equal(doc.id, 1);
        done();
      });
    });

    it('finds a doc by a uuid primary key', function (done) {
      db.uuid_docs.findOne(function (err, row) {
        assert.ifError(err);

        db.uuid_docs.findDoc(row.id, function(err,doc) {
          assert.ifError(err);
          assert.equal(doc.id, row.id);
          done();
        });
      });
    });

    it('finds a doc with > comparison on primary key', function (done) {
      db.docs.findDoc({"id >" : 1}, function(err,doc){
        assert.ifError(err);
        assert.equal(doc.length, 2);
        done();
      });
    });

    it('finds a doc with >= comparison on primary key', function (done) {
      db.docs.findDoc({"id >=" : 2}, function(err,doc){
        assert.ifError(err);
        assert.equal(doc.length, 2);
        done();
      });
    });
  });

  describe('Querying documents by fields', function () {
    it('finds a doc by title', function (done) {
      db.docs.findDoc({title : "A Document"}, function(err,docs){
        //find will return multiple if id not specified... confusing?
        assert.ifError(err);
        assert.equal(docs[0].title, "A Document");
        done();
      });
    });

    it('parses greater than with two string defs', function (done) {
      db.docs.findDoc({"price >" : "18"}, function(err,docs){
        assert.ifError(err);
        assert.equal(docs[0].title, "A Document");
        done();
      });
    });

    it('parses greater than with a numeric', function (done) {
      db.docs.findDoc({"price >" : 18}, function(err,docs){
        assert.ifError(err);
        assert.equal(docs[0].title, "A Document");
        done();
      });
    });

    it('parses less than with a numeric', function (done) {
      db.docs.findDoc({"price <" : 18}, function(err,docs){
        assert.ifError(err);
        assert.equal(docs[0].title, "Starsky and Hutch");
        done();
      });
    });

    it('deals with arrays using IN', function (done) {
      db.docs.findDoc({"price" : [18, 6]}, function(err,docs){
        assert.ifError(err);
        assert.equal(docs.length, 2);
        done();
      });
    });

    it('deals with arrays using NOT IN', function (done) {
      db.docs.findDoc({"price <>" : [18, 6]}, function(err,docs){
        assert.ifError(err);
        assert.equal(docs.length, 1);
        done();
      });
    });

    it('executes a contains if passed an array of objects', function (done) {
      db.docs.findDoc({studios : [{name : "Warner"}]}, function(err,docs){
        assert.ifError(err);
        assert.equal(docs.length, 1);
        done();
      });
    });

    it('works properly with dates', function (done) {
      db.docs.findDoc({"created_at <" : new Date(1980, 1,1)}, function(err,docs){
        assert.ifError(err);
        assert.equal(docs.length, 1);
        done();
      });
    });
  });

  describe('Querying with options', function () {
    it('returns the first matching document', function (done) {
      db.docs.findDoc("*", {single: true}, function(err,res) {
        assert.ifError(err);
        assert.equal(res.id, 1);
        done();
      });
    });

    it('applies offset and limit with a fixed sort by pk', function (done) {
      db.docs.findDoc("*", {offset: 1, limit: 1}, function(err,res) {
        assert.ifError(err);
        assert.equal(res.length, 1);
        assert.equal(res[0].id, 2);
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
        assert.ifError(err);
        assert.equal(1, docs.length);
        done();
      });
    });

    it('works on multiple key', function (done) {
      db.docs.searchDoc({
        keys : ["title", "description"],
        term : "Starsky"
      }, function(err, docs){
        assert.ifError(err);
        assert.equal(1, docs.length);
        done();
      });
    });

    it('returns multiple results', function (done) {
      db.docs.searchDoc({
        keys : ["title"],
        term : "Document"
      }, function(err, docs){
        assert.ifError(err);
        assert.equal(2, docs.length);
        done();
      });
    });

    it('returns properly formatted documents with id etc', function (done) {
      db.docs.searchDoc({
        keys : ["title", "description"],
        term : "Starsky"
      }, function(err, docs){
        assert.ifError(err);
        assert.equal(docs[0].title, "Starsky and Hutch");
        done();
      });
    });
  });
});
