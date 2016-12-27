const assert = require("chai").assert;

describe("Table Inheritance", function () {
  var db;

  before(function() {
    return resetDb("inheritance").then(instance => db = instance);
  });

  describe("Querying", function () {
    it("includes descendant rows with the parent schema by default", function () {
      return db.cities.find().then(res => {
        assert.equal(res.length, 10);

        var okc = res.filter(function (c) { return c.name === "Oklahoma City"; })[0];

        assert(okc);
        assert.equal(okc.hasOwnProperty("of_state"), false);
      });
    });

    it("excludes descendant rows if the options specify ONLY", function () {
      return db.cities.find({}, {only: true}).then(res => {
        assert.equal(res.length, 6);
      });
    });

    it("does load descendant tables", function () {
      assert.equal(db.hasOwnProperty("capitals"), true);
    });

    it("descendant table rows", function () {
      return db.capitals.find().then(res => {
        assert.equal(res.length, 4);

        assert.equal(res[0].hasOwnProperty("of_state"), true);
      });
    });
  });

  describe("Writing via the parent table", function () {
    it("does not update descendant rows from the parent table", function () {
      return db.cities.update({name: "Phoenix"}, {population: 1563099}).then(res => {
        assert.equal(res.length, 0);
      });
    });

    it("does not delete descendant rows from the parent table", function () {
      return db.cities.destroy({name: "Nashville"}).then(res => {
        assert.equal(res.length, 0);
      });
    });
  });
});
