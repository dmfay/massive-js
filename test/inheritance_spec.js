const assert = require("chai").assert;

describe("Table Inheritance", function () {
  var db;

  before(function() {
    return resetDb("inheritance").then(instance => db = instance);
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

    it("does load descendant tables", function () {
      assert.equal(db.hasOwnProperty("capitals"), true);
    });

    it("descendant table rows", function (done) {
      db.capitals.find(function (err,res) {
        assert.ifError(err);
        assert.equal(res.length, 4);

        assert.equal(res[0].hasOwnProperty("of_state"), true);

        done();
      });
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
