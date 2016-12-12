describe("Connecting", function () {
  before(function() {
    return resetDb("loader");
  });

  it("connects", function* () {
    const db = yield massive.connect({
      connectionString: connectionString,
      scripts: `${__dirname}/db`
    });

    assert.isOk(db);
  });

  it("overrides and applies defaults", function* () {
    const db = yield massive.connect({
      connectionString: connectionString,
      scripts: `${__dirname}/db`,
      defaults: {
        parseInt8: true
      }
    });

    assert.equal(db.defaults.parseInt8, true);

    return assert.eventually.strictEqual(db.t1.count(), 0);
  });

  it("rejects connection blocks without a connstr or db", function () {
    assert.isRejected(massive.connect({things: "stuff"}));
  });
});
