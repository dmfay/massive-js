const assert = require("chai").assert;
const massive = require("../index");
const helpers = require("./helpers");

require("co-mocha");

describe("Connecting", function () {
  before(function() {
    return helpers.resetDb("loader");
  });

  it("connects", function* () {
    const db = yield massive.connect({
      connectionString: helpers.connectionString,
      scripts: `${__dirname}/db`
    });

    assert.isOk(db);
  });

  it("overrides and applies defaults", function* () {
    const db = yield massive.connect({
      connectionString: helpers.connectionString,
      scripts: `${__dirname}/db`,
      defaults: {
        parseInt8: true
      }
    });

    assert.equal(db.defaults.parseInt8, true);

    const count = yield db.t1.count({});

    assert.equal(typeof count, "number");
  });

  it("rejects connection blocks without a connstr or db", function* () {
    try {
      yield massive.connect({
        things: "stuff"
      });

      assert.fail();
    } catch (err) {
      assert.equal(err.message, "Need a connectionString or db (name of database on localhost) to connect.");
    }
  });
});
