var assert = require("assert");
var helpers = require("./helpers");
var db;

describe('Schema-Bound Document Saves', function () {

  before(function(done){
    helpers.resetDb(function(err,res){
      db = res;
      done();
    });
  });

  describe("To a non-existent table", function () {
    var newDoc = {};
    before(function(done){
      db.saveDoc("myschema.doggies", {name : "Fido", age : 10}, function(err,doc){
        newDoc = doc;
        done();
      });
    });
    it('creates the table', function () {
      assert(db.myschema.doggies);
    });
    it('returns the doc', function () {
      assert.equal("Fido", newDoc.name);
    });
    it('updates the doc', function (done) {
      newDoc.name = "Bruno";
      db.myschema.doggies.saveDoc(newDoc, function (err, res) {
        assert.ifError(err);
        assert.equal(res.name, "Bruno");
        done();
      });
    });
    it("finds the updated document", function (done) {
      db.myschema.doggies.findDoc({id:1}, function(err, res) {
        assert.ifError(err);
        assert.equal(res.name, "Bruno");
        done();
      });
    });
    it("deletes the doc", function (done) {
      // should there be a 'destroyDoc' method defined on document_table?
      db.myschema.doggies.destroy({ id : 1 }, function(err, res) {
        assert.ifError(err);
        assert.equal(res[0].body.name, "Bruno");
        done();
      });
    });
    after(function(done){
      db.query("DROP TABLE myschema.doggies;", done);
    });

  });

    describe("To an Existing Table", function() {
    var film ={};

    before(function(done) {
      db.myschema.docs.saveDoc( { title : "Alone", description : "yearning in the darkness", price : 89.99, is_good : true, created_at : "2015-03-04T09:43:41.643Z" }, function(err, res) {
        assert.ifError(err);
        film = res;
        done();
      });
    });

    it("Saves a new movie", function () {
      assert(film.title == "Alone" && film.id == 4);
    });
    it("updates the movie title", function (done) {
      film.title = "Together!";
      db.myschema.docs.saveDoc(film, function(err, res) {
        assert.ifError(err);
        assert.equal(res.title, "Together!");
        done();
      });
    });
    it("finds the updated movie title", function (done) {
      db.myschema.docs.findDoc({id:4}, function(err, res) {
        assert.ifError(err);
        assert.equal(res.title, "Together!");
        done();
      });
    });
    it("deletes the movie", function (done) {
      // should there be a 'destroyDoc' method defined on document_table?
      db.myschema.docs.destroy({ id : 4 }, function(err, res) {
        assert.ifError(err);
        assert.equal(res[0].body.title, "Together!");
        done();
      });
    });
  });

});
