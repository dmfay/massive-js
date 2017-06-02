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
    it('connects with a connectionString property', function () {
      return massive({ connectionString: connectionString }, {}, { noWarnings: true }).then(db => {
        assert.isOk(db);
        assert.isOk(db.t1);
      });
    });

    it('connects with a connection string literal', function () {
      return massive(connectionString, {}, { noWarnings: true }).then(db => {
        assert.isOk(db);
        assert.isOk(db.t1);
      });
    });

    it('connects with a property map', function () {
      massive({ host: 'localhost', database: 'massive' }, {}, { noWarnings: true }).then(db => {
        assert.isOk(db);
        assert.isOk(db.t1);
      });
    });

    it('connects to localhost with a database name', function () {
      massive({ db: 'massive' }, {}, { noWarnings: true }).then(db => {
        assert.isOk(db);
        assert.isOk(db.t1);
      });
    });

    it('rejects with connection errors', function () {
      return massive({ database: 'doesntexist' }, {}, { noWarnings: true }).then(
        () => { assert.fail(); },
        err => {
          assert.equal(err.code, '3D000');
          return Promise.resolve();
        }
      );
    });

    it('rejects undefined connections', function () {
      assert.isRejected(massive(), 'No connection information specified.');
    });

    it('rejects empty connection blocks', function () {
      assert.isRejected(massive({}), 'No connection information specified.');
    });

    it('rejects empty connection strings', function () {
      assert.isRejected(massive(''), 'No connection information specified.');
    });
  });

  describe('configuration', function () {
    it('allows undefined scripts directories', function () {
      massive(connectionString, {}, { noWarnings: true }).then(db => {
        assert.lengthOf(db.functions, 4);
      });
    });

    it('exposes driver defaults through pg-promise', function () {
      massive(connectionString, {}, { noWarnings: true }).then(db => {
        assert.isDefined(db.pgp.pg.defaults.parseInputDatesAsUTC);
      });
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

    it('loads query files and functions', function () {
      assert.ok(db.functions.length > 1);
      assert.lengthOf(db.functions.filter(f => f.sql instanceof pgp.QueryFile), 1); // just the schema script
    });

    it('loads everything it can by default', function () {
      return massive(connectionString, {
        scripts: `${__dirname}/helpers/scripts/loader`
      }, {
        noWarnings: true
      }).then(db => {
        assert.isOk(db);
        assert(!!db.t1 && !!db.t2 && !!db.tA);
        assert(!!db.v1 && !!db.v2);
        assert(!!db.mv1 && !!db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !!db.one.t1 && !!db.one.t2 && !!db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!!db.two && !! db.two.t1);
        assert.lengthOf(db.tables, 6);
        assert.lengthOf(db.views, 6);
        assert.lengthOf(db.functions, 5);
        assert.lengthOf(db.functions.filter(f => f.sql instanceof pgp.QueryFile), 1);
      });
    });

    it('does not load tables without primary keys', function () {
      return massive(connectionString, {}, { noWarnings: true }).then(db => {
        assert(!db.t3); // tables without primary keys aren't loaded
      });
    });
  });

  describe('schema filters', function () {
    it('applies filters', function () {
      return massive(connectionString, {
        scripts: `${__dirname}/helpers/scripts/loader`,
        allowedSchemas: 'one, two'
      }, {
        noWarnings: true
      }).then(db => {
        assert(db);
        assert(!db.t1 && !db.t2 && !db.tA);
        assert(!db.v1 && !db.v2);
        assert(!db.mv1 && !db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !!db.one.t1 && !!db.one.t2 && !!db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!!db.two && !!db.two.t1);
        assert.equal(db.tables.length, 3);
        assert.equal(db.views.length, 2);
        assert.lengthOf(db.functions, 5);
        assert.lengthOf(db.functions.filter(f => f.sql instanceof pgp.QueryFile), 1);
      });
    });

    it('allows exceptions', function () {
      return massive(connectionString, {
        scripts: `${__dirname}/helpers/scripts/loader`,
        allowedSchemas: 'two',
        exceptions: 't1, v1, one.v2'
      }, {
        noWarnings: true
      }).then(db => {
        assert(db);
        assert(!!db.t1 && !db.t2 && !db.tA);
        assert(!!db.v1 && !db.v2);
        assert(!db.mv1 && !db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.t1 && !db.one.t2 && !db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!!db.two && !!db.two.t1);
        assert.equal(db.tables.length, 2);
        assert.equal(db.views.length, 2);
        assert.lengthOf(db.functions, 5);
        assert.lengthOf(db.functions.filter(f => f.sql instanceof pgp.QueryFile), 1);
      });
    });
  });

  describe('table blacklists', function () {
    it('applies blacklists to tables and views', function () {
      return massive(connectionString, {
        scripts: `${__dirname}/helpers/scripts/loader`,
        blacklist: '%1, one.%2'
      }, {
        noWarnings: true
      }).then(db => {
        assert(db);
        assert(!db.t1 && !!db.t2 && !!db.tA);
        assert(!db.v1 && !!db.v2);
        assert(!db.mv1 && !!db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.t1 && !db.one.t2 && !db.one.v1 && !db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!db.two);
        assert.equal(db.tables.length, 2);
        assert.equal(db.views.length, 2);
        assert.lengthOf(db.functions, 5);
        assert.lengthOf(db.functions.filter(f => f.sql instanceof pgp.QueryFile), 1);
      });
    });

    it('checks schema names in the pattern', function () {
      return massive(connectionString, {
        scripts: `${__dirname}/helpers/scripts/loader`,
        blacklist: 'one.%1'
      }, {
        noWarnings: true
      }).then(db => {
        assert(db);
        assert(!!db.t1 && !!db.t2 && !!db.tA);
        assert(!!db.v1 && !!db.v2);
        assert(!!db.mv1 && !!db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.t1 && !!db.one.t2 && !db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!!db.two && !!db.two.t1);
        assert.equal(db.tables.length, 5);
        assert.equal(db.views.length, 5);
        assert.lengthOf(db.functions, 5);
        assert.lengthOf(db.functions.filter(f => f.sql instanceof pgp.QueryFile), 1);
      });
    });

    it('allows exceptions', function () {
      return massive(connectionString, {
        scripts: `${__dirname}/helpers/scripts/loader`,
        blacklist: '%1',
        exceptions: 'one.%1'
      }, {
        noWarnings: true
      }).then(db => {
        assert(db);
        assert(!db.t1 && !!db.t2 && !!db.tA);
        assert(!db.v1 && !!db.v2);
        assert(!db.mv1 && !!db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !!db.one.t1 && !!db.one.t2 && !!db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!db.two);
        assert.equal(db.tables.length, 4);
        assert.equal(db.views.length, 4);
        assert.lengthOf(db.functions, 5);
        assert.lengthOf(db.functions.filter(f => f.sql instanceof pgp.QueryFile), 1);
      });
    });
  });

  describe('table whitelists', function () {
    it('applies a whitelist with exact matching', function () {
      return massive(connectionString, {
        scripts: `${__dirname}/helpers/scripts/loader`,
        whitelist: 't1, one.t1'
      }, {
        noWarnings: true
      }).then(db => {
        assert(db);
        assert(!!db.t1 && !db.t2 && !db.tA);
        assert(!db.v1 && !db.v2);
        assert(!db.mv1 && !db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !!db.one.t1 && !db.one.t2 && !db.one.v1 && !db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!db.two);
        assert.equal(db.tables.length, 2);
        assert.equal(db.views.length, 0);
        assert.lengthOf(db.functions, 5);
        assert.lengthOf(db.functions.filter(f => f.sql instanceof pgp.QueryFile), 1);
      });
    });

    it('overrides other filters', function () {
      return massive(connectionString, {
        scripts: `${__dirname}/helpers/scripts/loader`,
        allowedSchemas: 'one',
        blacklist: 't1',
        whitelist: 't1'
      }, {
        noWarnings: true
      }).then(db => {
        assert(db);
        assert(!!db.t1 && !db.t2 && !db.tA);
        assert(!db.v1 && !db.v2);
        assert(!db.mv1 && !db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.t1 && !db.one.t2 && !db.one.v1 && !db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!db.two);
        assert.equal(db.tables.length, 1);
        assert.equal(db.views.length, 0);
        assert.lengthOf(db.functions, 5);
        assert.lengthOf(db.functions.filter(f => f.sql instanceof pgp.QueryFile), 1);
      });
    });
  });

  describe('function exclusion', function () {
    it('skips loading functions when set', function () {
      return massive(connectionString, {
        scripts: `${__dirname}/helpers/scripts/loader`,
        excludeFunctions: true
      }, {
        noWarnings: true
      }).then(db => {
        assert.lengthOf(db.functions, 1);
        assert.lengthOf(db.functions.filter(f => f.sql instanceof pgp.QueryFile), 1);
      });
    });

    it('loads all functions when false', function () {
      return massive(connectionString, {
        scripts: `${__dirname}/helpers/scripts/loader`,
        excludeFunctions: false
      }, {
        noWarnings: true
      }).then(db => {
        assert.lengthOf(db.functions, 5);
        assert.lengthOf(db.functions.filter(f => f.sql instanceof pgp.QueryFile), 1);
      });
    });
  });

  describe('function filtering', function () {
    it('blacklists functions', function () {
      return massive(connectionString, {
        scripts: `${__dirname}/helpers/scripts/loader`,
        functionBlacklist: '%1, one.f2'
      }, {
        noWarnings: true
      }).then(db => {
        assert(!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.f1 && !db.one.f2);
      });
    });

    it('whitelists functions', function () {
      return massive(connectionString, {
        scripts: `${__dirname}/helpers/scripts/loader`,
        functionWhitelist: '%1, one.f2'
      }, {
        noWarnings: true
      }).then(db => {
        assert(!!db.f1 && !db.f2);
        assert(!!db.one && !!db.one.f1 && !!db.one.f2);
      });
    });

    it('overlaps whitelists and blacklists', function () {
      return massive(connectionString, {
        scripts: `${__dirname}/helpers/scripts/loader`,
        functionBlacklist: 'one.%1',
        functionWhitelist: 'one.%'
      }, {
        noWarnings: true
      }).then(db => {
        assert(!db.f1 && !db.f2);
        assert(!!db.one && !db.one.f1 && !!db.one.f2);
      });
    });
  });
});
