'use strict';
describe("Connecting", function () {
  before(function() {
    return resetDb("loader");
  });

  it("connects with a connectionString property", function* () {
    const db = yield massive({
      scripts: `${__dirname}/db`,
      noWarnings: true
    }, {
      connectionString: connectionString
    });

    assert.isOk(db);
    assert.isOk(db.t1);
  });

  it("connects with a connection string literal", function* () {
    const db = yield massive({
      scripts: `${__dirname}/db`,
      noWarnings: true
    }, connectionString);

    assert.isOk(db);
    assert.isOk(db.t1);
  });

  it("builds a connectionString if given a database name", function* () {
    const db = yield massive({
      scripts: `${__dirname}/db`,
      noWarnings: true
    }, {
      db: "massive"
    });

    assert.isOk(db);
    assert.isOk(db.t1);
  });

  it("connects with pool configuration", function* () {
    const db = yield massive({
      poolSize: 5,
      scripts: `${__dirname}/db`,
      noWarnings: true
    }, {
      user: "postgres",
      database: "massive",
      host: "localhost",
      port: 5432
    });

    assert.isOk(db);
    assert.isOk(db.t1);
  });

  it("rejects with connection errors", function () {
    return massive({
      scripts: `${__dirname}/db`,
      noWarnings: true
    }, {
      database: 'doesntexist'
    }).then(
      () => { assert.fail(); },
      err => {
        assert.equal(err.code, '3D000');
        return Promise.resolve();
      }
    );
  });

  it("allows undefined scripts directories", function () {
    return massive({
      noWarnings: true
    }, {
      db: "massive"
    });
  });

  it.skip("overrides and applies defaults", function* () {
    const db = yield massive({
      scripts: `${__dirname}/db`,
      defaults: {
        parseInt8: true
      },
      noWarnings: true
    }, connectionString);

    return assert.eventually.strictEqual(db.t1.count(), 0);
  });

  it("rejects undefined connections", function () {
    assert.isRejected(massive({}), 'No connection information specified.');
  });

  it("rejects empty connection blocks", function () {
    assert.isRejected(massive({}, {}), 'No connection information specified.');
  });

  it("rejects empty connection strings", function () {
    assert.isRejected(massive({}, ''), 'No connection information specified.');
  });
});
