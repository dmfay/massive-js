'use strict';
describe("Connecting", function () {
  before(function() {
    return resetDb("loader");
  });

  it("connects with a connectionString", function* () {
    const db = yield massive.connect({
      connectionString: connectionString,
      scripts: `${__dirname}/db`
    });

    assert.isOk(db);
    assert.isOk(db.t1);
  });

  it("builds a connectionString if given a database name", function* () {
    const db = yield massive.connect({
      db: "massive",
      scripts: `${__dirname}/db`
    });

    assert.isOk(db);
    assert.isOk(db.t1);
  });

  it("connects with pool configuration", function* () {
    const db = yield massive.connect({
      user: "postgres",
      database: "massive",
      host: "localhost",
      port: 5432,
      max: 5,
      idleTimeoutMillis: 30000,
      scripts: `${__dirname}/db`
    });

    assert.isOk(db);
    assert.isOk(db.t1);
    assert.isOk(db.pool);
    assert.equal(db.pool.options.max, 5);
  });

  it("rejects with connection errors", function () {
    // nb: if you pass *nothing*, you wind up with a pool created for you
    // going to a database named after you, no password, at localhost:5432
    // which may very possibly exist!
    return massive.connect({ database: 'doesntexist', scripts: `${__dirname}/db` })
      .then(
        () => { assert.fail(); },
        err => {
          assert.equal(err.code, "3D000");  // invalid catalog name
          return Promise.resolve();
        }
      );
  });

  it("rejects if no valid scripts directory exists", function () {
    return massive.connect({ db: "massive" })
      .then(
        () => { assert.fail(); },
        err => {
          assert.equal(err.code, "ENOENT");
          return Promise.resolve();
        }
      );
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
