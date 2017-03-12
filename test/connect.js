'use strict';

let db;

describe('connecting', function () {
  before(function() {
    return resetDb('loader').then(instance => db = instance);
  });

  it('returns a database connection', function () {
    assert.isOk(db);
    assert.isOk(db.tables);
    assert.isOk(db.functions);
  });

  describe('variations', function () {
    it('connects with a connectionString property', function* () {
      const db = yield massive({
        scripts: `${__dirname}/helpers/scripts`,
        noWarnings: true
      }, {
        connectionString: connectionString
      });

      assert.isOk(db);
      assert.isOk(db.t1);
    });

    it('connects with a connection string literal', function* () {
      const db = yield massive({
        scripts: `${__dirname}/helpers/scripts`,
        noWarnings: true
      }, connectionString);

      assert.isOk(db);
      assert.isOk(db.t1);
    });

    it('connects to localhost with a database name', function* () {
      const db = yield massive({
        scripts: `${__dirname}/helpers/scripts`,
        noWarnings: true
      }, {
        db: 'massive'
      });

      assert.isOk(db);
      assert.isOk(db.t1);
    });

    it('connects with pool configuration', function* () {
      const db = yield massive({
        poolSize: 5,
        scripts: `${__dirname}/helpers/scripts`,
        noWarnings: true
      }, {
        user: 'postgres',
        database: 'massive',
        host: 'localhost',
        port: 5432
      });

      assert.isOk(db);
      assert.isOk(db.t1);
    });

    it('rejects with connection errors', function () {
      return massive({
        scripts: `${__dirname}/helpers/scripts`,
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

    it('rejects undefined connections', function () {
      assert.isRejected(massive({}), 'No connection information specified.');
    });

    it('rejects empty connection blocks', function () {
      assert.isRejected(massive({}, {}), 'No connection information specified.');
    });

    it('rejects empty connection strings', function () {
      assert.isRejected(massive({}, ''), 'No connection information specified.');
    });
  });

  describe('configuration', function () {
    it('allows undefined scripts directories', function () {
      return massive({
        noWarnings: true
      }, {
        db: 'massive'
      });
    });

    it('exposes driver defaults through pg-promise', function* () {
      const db = yield massive({
        scripts: `${__dirname}/helpers/scripts`,
        noWarnings: true
      }, connectionString);

      assert.isDefined(db.pgp.pg.defaults.parseInputDatesAsUTC);
    });
  });

  describe('object loading', function () {
    it('loads non-public schemata as namespace properties', function () {
      assert.isOk(db.one);
      assert.isOk(db.two);
      assert.isOk(db.one.t1);
      assert.isOk(db.one.v1);
      assert.isOk(db.one.f1);

      assert.eventually.equal(db.one.t1.count(), 0);
    });

    it('loads all tables', function () {
      assert.equal(db.tables.length, 6);
    });

    it('loads all views', function () {
      assert.equal(db.views.length, 6);
    });

    it('loads query files', function () {
      assert.ok(db.functions.length > 0);
      assert.lengthOf(db.functions.filter(f => !!f.filePath), 11);
    });

    it('loads functions', function () {
      assert.equal(db.functions.length, 15);
      assert.lengthOf(db.functions.filter(f => !f.filePath), 4);
    });

    it('loads everything it can by default', function () {
      return massive({
        scripts: `${__dirname}/helpers/scripts`,
        noWarnings: true
      }, connectionString).then(db => {
        assert.isOk(db);
        assert(!!db.t1 && !!db.t2 && !!db.tA);
        assert(!!db.v1 && !!db.v2);
        assert(!!db.mv1 && !!db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !!db.one.t1 && !!db.one.t2 && !!db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!!db.two && !! db.two.t1);
        assert.lengthOf(db.tables, 6);
        assert.lengthOf(db.views, 6);
        assert.lengthOf(db.functions, 15);
        assert.lengthOf(db.functions.filter(f => !f.filePath), 4);
      });
    });

    it('does not load tables without primary keys', function () {
      return massive({
        scripts: `${__dirname}/helpers/scripts`,
        noWarnings: true
      }, connectionString).then(db => {
        assert(!db.t3); // tables without primary keys aren't loaded
      });
    });
  });

  describe('schema filters', function () {
    it('applies filters', function () {
      return massive({
        scripts: `${__dirname}/helpers/scripts`,
        schema: 'one, two',
        noWarnings: true
      }, connectionString).then(db => {
        assert(db);
        assert(!db.t1 && !db.t2 && !db.tA);
        assert(!db.v1 && !db.v2);
        assert(!db.mv1 && !db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !!db.one.t1 && !!db.one.t2 && !!db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!!db.two && !!db.two.t1);
        assert.equal(db.tables.length, 3);
        assert.equal(db.views.length, 2);
        assert.lengthOf(db.functions, 15);
        assert.lengthOf(db.functions.filter(f => !f.filePath), 4);
      });
    });

    it('allows exceptions', function () {
      return massive({
        scripts: `${__dirname}/helpers/scripts`,
        schema: 'two',
        exceptions: 't1, v1, one.v2',
        noWarnings: true
      }, connectionString).then(db => {
        assert(db);
        assert(!!db.t1 && !db.t2 && !db.tA);
        assert(!!db.v1 && !db.v2);
        assert(!db.mv1 && !db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.t1 && !db.one.t2 && !db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!!db.two && !!db.two.t1);
        assert.equal(db.tables.length, 2);
        assert.equal(db.views.length, 2);
        assert.lengthOf(db.functions, 15);
        assert.lengthOf(db.functions.filter(f => !f.filePath), 4);
      });
    });
  });

  describe('table blacklists', function () {
    it('applies blacklists to tables and views', function () {
      return massive({
        scripts: `${__dirname}/helpers/scripts`,
        blacklist: '%1, one.%2',
        noWarnings: true
      }, connectionString).then(db => {
        assert(db);
        assert(!db.t1 && !!db.t2 && !!db.tA);
        assert(!db.v1 && !!db.v2);
        assert(!db.mv1 && !!db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.t1 && !db.one.t2 && !db.one.v1 && !db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!db.two);
        assert.equal(db.tables.length, 2);
        assert.equal(db.views.length, 2);
        assert.lengthOf(db.functions, 15);
        assert.lengthOf(db.functions.filter(f => !f.filePath), 4);
      });
    });

    it('checks schema names in the pattern', function () {
      return massive({
        scripts: `${__dirname}/helpers/scripts`,
        blacklist: 'one.%1',
        noWarnings: true
      }, connectionString).then(db => {
        assert(db);
        assert(!!db.t1 && !!db.t2 && !!db.tA);
        assert(!!db.v1 && !!db.v2);
        assert(!!db.mv1 && !!db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.t1 && !!db.one.t2 && !db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!!db.two && !!db.two.t1);
        assert.equal(db.tables.length, 5);
        assert.equal(db.views.length, 5);
        assert.lengthOf(db.functions, 15);
        assert.lengthOf(db.functions.filter(f => !f.filePath), 4);
      });
    });

    it('allows exceptions', function () {
      return massive({
        scripts: `${__dirname}/helpers/scripts`,
        blacklist: '%1',
        exceptions: 'one.%1',
        noWarnings: true
      }, connectionString).then(db => {
        assert(db);
        assert(!db.t1 && !!db.t2 && !!db.tA);
        assert(!db.v1 && !!db.v2);
        assert(!db.mv1 && !!db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !!db.one.t1 && !!db.one.t2 && !!db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!db.two);
        assert.equal(db.tables.length, 4);
        assert.equal(db.views.length, 4);
        assert.lengthOf(db.functions, 15);
        assert.lengthOf(db.functions.filter(f => !f.filePath), 4);
      });
    });
  });

  describe('table whitelists', function () {
    it('applies a whitelist with exact matching', function () {
      return massive({
        scripts: `${__dirname}/helpers/scripts`,
        whitelist: 't1, one.t1',
        noWarnings: true
      }, connectionString).then(db => {
        assert(db);
        assert(!!db.t1 && !db.t2 && !db.tA);
        assert(!db.v1 && !db.v2);
        assert(!db.mv1 && !db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !!db.one.t1 && !db.one.t2 && !db.one.v1 && !db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!db.two);
        assert.equal(db.tables.length, 2);
        assert.equal(db.views.length, 0);
        assert.lengthOf(db.functions, 15);
        assert.lengthOf(db.functions.filter(f => !f.filePath), 4);
      });
    });

    it('overrides other filters', function () {
      return massive({
        scripts: `${__dirname}/helpers/scripts`,
        schema: 'one',
        blacklist: 't1',
        whitelist: 't1',
        noWarnings: true
      }, connectionString).then(db => {
        assert(db);
        assert(!!db.t1 && !db.t2 && !db.tA);
        assert(!db.v1 && !db.v2);
        assert(!db.mv1 && !db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.t1 && !db.one.t2 && !db.one.v1 && !db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!db.two);
        assert.equal(db.tables.length, 1);
        assert.equal(db.views.length, 0);
        assert.lengthOf(db.functions, 15);
        assert.lengthOf(db.functions.filter(f => !f.filePath), 4);
      });
    });
  });

  describe('function exclusion', function () {
    it('skips loading functions when set', function () {
      return massive({
        scripts: `${__dirname}/helpers/scripts`,
        excludeFunctions: true,
        noWarnings: true
      }, connectionString).then(db => {
        assert.lengthOf(db.functions, 11);
        assert.lengthOf(db.functions.filter(f => !f.filePath), 0);
      });
    });

    it('loads all functions when false', function () {
      return massive({
        scripts: `${__dirname}/helpers/scripts`,
        excludeFunctions: false,
        noWarnings: true
      }, connectionString).then(db => {
        assert.lengthOf(db.functions, 15);
        assert.lengthOf(db.functions.filter(f => !f.filePath), 4);
      });
    });
  });

  describe('function filtering', function () {
    it('blacklists functions', function () {
      return massive({
        scripts: `${__dirname}/helpers/scripts`,
        functionBlacklist: '%1, one.f2',
        noWarnings: true
      }, connectionString).then(db => {
        assert(!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.f1 && !db.one.f2);
      });
    });

    it('whitelists functions', function () {
      return massive({
        scripts: `${__dirname}/helpers/scripts`,
        functionWhitelist: '%1, one.f2',
        noWarnings: true
      }, connectionString).then(db => {
        assert(!!db.f1 && !db.f2);
        assert(!!db.one && !!db.one.f1 && !!db.one.f2);
      });
    });

    it('overlaps whitelists and blacklists', function () {
      return massive({
        scripts: `${__dirname}/helpers/scripts`,
        functionBlacklist: 'one.%1',
        functionWhitelist: 'one.%',
        noWarnings: true
      }, connectionString).then(db => {
        assert(!db.f1 && !db.f2);
        assert(!!db.one && !db.one.f1 && !!db.one.f2);
      });
    });
  });
});
