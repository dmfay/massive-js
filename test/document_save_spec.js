var assert = require("assert");
var helpers = require("./helpers");
var db;

describe('Document saves', function () {

  before(function(done){
    helpers.resetDb(function(err,res){
      db = res;
      done();
    });
  });

  describe("To a non-existent table", function () {
    var newDoc = {};

    before(function(done){
      db.saveDoc("doggies", {name : "Fido", age : 10}, function(err,doc){
        assert.ifError(err);
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

    it('updates the doc', function (done) {
      newDoc.name = "Bruno";
      db.doggies.saveDoc(newDoc, function (err, saved) {
        assert.ifError(err);
        assert.equal(saved.name, "Bruno");
        assert.equal(saved.id, newDoc.id);
        done();
      });
    });

    it("finds the updated document", function (done) {
      db.doggies.findDoc({id:1}, function(err, res) {
        assert.ifError(err);
        assert.equal(res.name, "Bruno");
        done();
      });
    });

    it("deletes the doc", function (done) {
      db.doggies.destroy({ id : 1 }, function(err, res) {
        assert.ifError(err);
        assert.equal(res[0].body.name, "Bruno");
        done();
      });
    });

    after(function(done){
      db.query("DROP TABLE doggies;", done);
    });
  });

  describe("To an Existing Table", function() {
    var film ={};

    before(function(done) {
      db.docs.saveDoc( { title : "Alone", description : "yearning in the darkness", price : 89.99, is_good : true, created_at : "2015-03-04T09:43:41.643Z" }, function(err, res) {
        assert.ifError(err);
        film = res;
        done();
      });
    });

    it("Saves a new movie", function (done) {
      assert(film.title == "Alone" && film.id == 4);
      done();
    });

    it("updates the movie title", function (done) {
      film.title = "Together!";
      db.docs.saveDoc(film, function (err, res) {
        assert.ifError(err);
        assert.equal(res.title, "Together!");
        assert.equal(res.id, film.id);
        done();
      });
    });

    it("finds the updated movie title", function (done) {
      db.docs.findDoc({ id: film.id }, function (err, res) {
        assert.ifError(err);
        assert.equal(res.title, "Together!");
        done();
      });
    });

    it("deletes the movie", function (done) {
      db.docs.destroy({ id : film.id }, function(err, res) {
        assert.ifError(err);
        assert.equal(res[0].body.title, "Together!");
        done();
      });
    });
  });
});
