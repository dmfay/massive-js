var assert = require("assert");
var helpers = require("./helpers");
var _ = require("underscore")._;
var db;

describe("Table Inheritance", function () {
  before(function(done) {
    helpers.resetDb("inheritance", function (err,res) {
      db = res;
      done();
    });
  });

  describe("Querying", function () {
    it("includes descendant rows with the parent schema by default", function (done) {
      db.cities.find(function (err,res) {
        assert.ifError(err);
        assert.equal(res.length, 10);

        var okc = res.filter(function (c) { return c.name === "Oklahoma City"; })[0];

        assert(okc);
        assert.equal(okc.hasOwnProperty("of_state"), false);

        done();
      });
    });

    it("excludes descendant rows if the options specify ONLY", function (done) {
      db.cities.find({}, {only: true}, function (err,res) {
        assert.ifError(err);
        assert.equal(res.length, 6);

        done();
      });
    });

    it("(currently) does not load descendant tables", function () {
      assert.equal(db.hasOwnProperty("capitals"), false);
    });
  });

  describe("Writing via the parent table", function () {
    it("does not update descendant rows from the parent table", function (done) {
      db.cities.update({name: "Phoenix"}, {population: 1563099}, function (err, res) {
        assert.ifError(err);
        assert.equal(res.length, 0);

        done();
      });
    });

    it("does not delete descendant rows from the parent table", function (done) {
      db.cities.destroy({name: "Nashville"}, function (err, res) {
        assert.ifError(err);
        assert.equal(res.length, 0);

        done();
      });
    });

  });
});
