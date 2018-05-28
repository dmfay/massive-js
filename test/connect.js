'use strict';

const Executable = require('../lib/executable');
const Readable = require('../lib/readable');
const Writable = require('../lib/writable');

describe('connecting', function () {
  let loader;

  before(function () {
    // override the default PG env vars for testing since empty user information
    // will default to the current username otherwise
    process.env.PGUSER = 'postgres';
    process.env.PGDATABASE = 'massive';

    return resetDb('loader').then(db => {
      loader = db.loader;

      return db.instance.$pool.end();
    });
  });

  after(function () {
    delete process.env.PGUSER;
    delete process.env.PGDATABASE;
  });

  it('exposes the Database class from the module', function () {
    assert.isOk(massive.Database);
  });

  it('returns a database connection', function () {
    return massive({connectionString}, loader).then(db => {
      assert.isOk(db);
      assert.isOk(db.loader);
      assert.isOk(db.driverConfig);
      assert.isTrue(db.objects.length > 0);
      assert.isOk(db.t1);

      return db.instance.$pool.end();
    });
  });

  describe('variations', function () {
    it('connects with a connectionString property', function () {
      return massive({connectionString}, loader).then(db => {
        assert.isOk(db);
        assert.isOk(db.t1);

        return db.instance.$pool.end();
      });
    });

    it('connects with a connection string literal', function () {
      return massive(connectionString, loader).then(db => {
        assert.isOk(db);
        assert.isOk(db.t1);

        return db.instance.$pool.end();
      });
    });

    it('connects with a property map', function () {
      return massive({host: 'localhost', database: 'massive', user: 'postgres'}, loader).then(db => {
        assert.isOk(db);
        assert.isOk(db.t1);

        return db.instance.$pool.end();
      });
    });

    it('rejects with connection errors', function () {
      return massive({database: 'doesntexist', user: 'postgres'}, loader).then(
        () => { assert.fail(); },
        err => {
          assert.equal(err.code, '3D000');
        }
      );
    });

    it('connects with undefined connections using default configuration', function () {
      return massive().then(db => {
        assert.isOk(db);

        return db.instance.$pool.end();
      });
    });

    it('connects with empty connection block using default configuration', function () {
      return massive({}).then(db => {
        assert.isOk(db);

        return db.instance.$pool.end();
      });
    });

    it('connects with empty connection strings using default configuration', function () {
      return massive('').then(db => {
        assert.isOk(db);

        return db.instance.$pool.end();
      });
    });
  });

  describe('configuration', function () {
    it('allows undefined scripts directories', function () {
      const testLoader = _.defaults({}, loader);  // lodash quirk: defaults works, cloneDeep doesn't

      delete testLoader.scripts;

      return massive(connectionString, testLoader).then(db => {
        assert.lengthOf(db.objects.filter(f => f instanceof Executable), 4);
        assert.lengthOf(db.objects.filter(f => f.sql instanceof pgp.QueryFile), 0);

        return db.instance.$pool.end();
      });
    });

    it('exposes driver defaults through pg-promise', function () {
      return massive(connectionString, loader).then(db => {
        assert.isDefined(db.pgp.pg.defaults.parseInputDatesAsUTC);

        return db.instance.$pool.end();
      });
    });
  });

  describe('object loading', function () {
    it('loads non-public schemata as namespace properties', function () {
      return massive({connectionString}, loader).then(db => {
        assert.isOk(db.one);
        assert.isOk(db.two);
        assert.isOk(db.one.t1);
        assert.isOk(db.one.v1);
        assert.isOk(db.one.f1);

        assert.eventually.equal(db.one.t1.count(), 0);

        return db.instance.$pool.end();
      });
    });

    it('loads all tables', function () {
      return massive({connectionString}, loader).then(db => {
        assert.lengthOf(db.objects.filter(o => o instanceof Writable), 7);

        return db.instance.$pool.end();
      });
    });

    it('loads all views', function () {
      return massive({connectionString}, loader).then(db => {
        assert.lengthOf(db.objects.filter(o => o instanceof Readable && !(o instanceof Writable)), 6);

        return db.instance.$pool.end();
      });
    });

    it('loads query files and functions', function () {
      const testLoader = _.defaults({
        scripts: `${__dirname}/helpers/scripts/loader`,
        noWarnings: true
      }, loader);

      return massive(connectionString, testLoader).then(db => {
        assert.isTrue(db.objects.filter(o => o instanceof Executable).length > 1);
        assert.lengthOf(db.objects.filter(f => f.sql instanceof pgp.QueryFile), 1); // just the schema script

        return db.instance.$pool.end();
      });
    });

    it('loads everything it can by default', function () {
      const testLoader = _.defaults({
        scripts: `${__dirname}/helpers/scripts/loader`,
        noWarnings: true
      }, loader);

      return massive(connectionString, testLoader).then(db => {
        assert.isOk(db);
        assert(!!db.t1 && !!db.t2 && !!db.t3 && !!db.tA);
        assert(!!db.v1 && !!db.v2);
        assert(!!db.mv1 && !!db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !!db.one.t1 && !!db.one.t2 && !!db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!!db.two && !!db.two.t1);
        assert.lengthOf(db.objects, 18);
        assert.lengthOf(db.objects.filter(o => o instanceof Readable), 13);
        assert.lengthOf(db.objects.filter(o => o instanceof Writable), 7);
        assert.lengthOf(db.objects.filter(o => o instanceof Executable), 5);
        assert.lengthOf(db.objects.filter(o => o instanceof Executable && o.sql instanceof pgp.QueryFile), 1);

        return db.instance.$pool.end();
      });
    });

    it('excludes materialized views', function () {
      const testLoader = _.defaults({
        scripts: `${__dirname}/helpers/scripts/loader`,
        noWarnings: true,
        excludeMatViews: true
      }, loader);

      return massive(connectionString, testLoader).then(db => {
        assert.isOk(db);
        assert(!!db.t1 && !!db.t2 && !!db.t3 && !!db.tA);
        assert(!!db.v1 && !!db.v2);
        assert(!db.mv1 && !db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !!db.one.t1 && !!db.one.t2 && !!db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!!db.two && !!db.two.t1);
        assert.lengthOf(db.objects, 16);
        assert.lengthOf(db.objects.filter(o => o instanceof Readable), 11);
        assert.lengthOf(db.objects.filter(o => o instanceof Writable), 7);
        assert.lengthOf(db.objects.filter(o => o instanceof Executable), 5);
        assert.lengthOf(db.objects.filter(o => o instanceof Executable && o.sql instanceof pgp.QueryFile), 1);

        return db.instance.$pool.end();
      });
    });
  });

  describe('schema filters', function () {
    it('applies filters', function () {
      const testLoader = _.defaults({
        scripts: `${__dirname}/helpers/scripts/loader`,
        allowedSchemas: 'one, two',
        noWarnings: true
      }, loader);

      return massive(connectionString, testLoader).then(db => {
        assert(db);
        assert(!db.t1 && !db.t2 && !db.t3 && !db.tA);
        assert(!db.v1 && !db.v2);
        assert(!db.mv1 && !db.mv2);
        assert(!db.f1 && !db.f2);
        assert(!!db.one && !!db.one.t1 && !!db.one.t2 && !!db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!!db.two && !!db.two.t1);
        assert.lengthOf(db.objects, 8);
        assert.lengthOf(db.objects.filter(o => o instanceof Readable), 5);
        assert.lengthOf(db.objects.filter(o => o instanceof Writable), 3);
        assert.lengthOf(db.objects.filter(o => o instanceof Executable), 3);
        assert.lengthOf(db.objects.filter(o => o instanceof Executable && o.sql instanceof pgp.QueryFile), 1);

        return db.instance.$pool.end();
      });
    });

    it('allows exceptions', function () {
      const testLoader = _.defaults({
        scripts: `${__dirname}/helpers/scripts/loader`,
        allowedSchemas: 'two',
        exceptions: 't1, v1, one.v2',
        noWarnings: true
      }, loader);

      return massive(connectionString, testLoader).then(db => {
        assert(db);
        assert(!!db.t1 && !db.t2 && !db.t3 && !db.tA);
        assert(!!db.v1 && !db.v2);
        assert(!db.mv1 && !db.mv2);
        assert(!db.f1 && !db.f2);
        assert(!!db.one && !db.one.t1 && !db.one.t2 && !db.one.v1 && !!db.one.v2 && !db.one.f1 && !db.one.f2);
        assert(!!db.two && !!db.two.t1);
        assert.lengthOf(db.objects, 5);
        assert.lengthOf(db.objects.filter(o => o instanceof Readable), 4);
        assert.lengthOf(db.objects.filter(o => o instanceof Writable), 2);
        assert.lengthOf(db.objects.filter(o => o instanceof Executable), 1);
        assert.lengthOf(db.objects.filter(o => o instanceof Executable && o.sql instanceof pgp.QueryFile), 1);

        return db.instance.$pool.end();
      });
    });
  });

  describe('table blacklists', function () {
    it('applies blacklists to tables and views', function () {
      const testLoader = _.defaults({
        scripts: `${__dirname}/helpers/scripts/loader`,
        blacklist: '%1, one.%2',
        noWarnings: true
      }, loader);

      return massive(connectionString, testLoader).then(db => {
        assert(db);
        assert(!db.t1 && !!db.t2 && !!db.t3 && !!db.tA);
        assert(!db.v1 && !!db.v2);
        assert(!db.mv1 && !!db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.t1 && !db.one.t2 && !db.one.v1 && !db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!db.two);
        assert.lengthOf(db.objects, 10);
        assert.lengthOf(db.objects.filter(o => o instanceof Readable), 5);
        assert.lengthOf(db.objects.filter(o => o instanceof Writable), 3);
        assert.lengthOf(db.objects.filter(o => o instanceof Executable), 5);
        assert.lengthOf(db.objects.filter(o => o instanceof Executable && o.sql instanceof pgp.QueryFile), 1);

        return db.instance.$pool.end();
      });
    });

    it('checks schema names in the pattern', function () {
      const testLoader = _.defaults({
        scripts: `${__dirname}/helpers/scripts/loader`,
        blacklist: 'one.%1',
        noWarnings: true
      }, loader);

      return massive(connectionString, testLoader).then(db => {
        assert(db);
        assert(!!db.t1 && !!db.t2 && !!db.t3 && !!db.tA);
        assert(!!db.v1 && !!db.v2);
        assert(!!db.mv1 && !!db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.t1 && !!db.one.t2 && !db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!!db.two && !!db.two.t1);
        assert.lengthOf(db.objects, 16);
        assert.lengthOf(db.objects.filter(o => o instanceof Readable), 11);
        assert.lengthOf(db.objects.filter(o => o instanceof Writable), 6);
        assert.lengthOf(db.objects.filter(o => o instanceof Executable), 5);
        assert.lengthOf(db.objects.filter(o => o instanceof Executable && o.sql instanceof pgp.QueryFile), 1);

        return db.instance.$pool.end();
      });
    });

    it('allows exceptions', function () {
      const testLoader = _.defaults({
        scripts: `${__dirname}/helpers/scripts/loader`,
        blacklist: '%1',
        exceptions: 'one.%1',
        noWarnings: true
      }, loader);

      return massive(connectionString, testLoader).then(db => {
        assert(db);
        assert(!db.t1 && !!db.t2 && !!db.t3 && !!db.tA);
        assert(!db.v1 && !!db.v2);
        assert(!db.mv1 && !!db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !!db.one.t1 && !!db.one.t2 && !!db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!db.two);
        assert.lengthOf(db.objects, 14);
        assert.lengthOf(db.objects.filter(o => o instanceof Readable), 9);
        assert.lengthOf(db.objects.filter(o => o instanceof Writable), 5);
        assert.lengthOf(db.objects.filter(o => o instanceof Executable), 5);
        assert.lengthOf(db.objects.filter(o => o instanceof Executable && o.sql instanceof pgp.QueryFile), 1);

        return db.instance.$pool.end();
      });
    });
  });

  describe('table whitelists', function () {
    it('applies a whitelist with exact matching', function () {
      const testLoader = _.defaults({
        scripts: `${__dirname}/helpers/scripts/loader`,
        whitelist: 't1, one.t1',
        noWarnings: true
      }, loader);

      return massive(connectionString, testLoader).then(db => {
        assert(db);
        assert(!!db.t1 && !db.t2 && !db.tA);
        assert(!db.v1 && !db.v2);
        assert(!db.mv1 && !db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !!db.one.t1 && !db.one.t2 && !db.one.v1 && !db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!db.two);
        assert.lengthOf(db.objects, 7);
        assert.lengthOf(db.objects.filter(o => o instanceof Readable), 2);
        assert.lengthOf(db.objects.filter(o => o instanceof Writable), 2);
        assert.lengthOf(db.objects.filter(o => o instanceof Executable), 5);
        assert.lengthOf(db.objects.filter(o => o instanceof Executable && o.sql instanceof pgp.QueryFile), 1);

        return db.instance.$pool.end();
      });
    });

    it('overrides other filters', function () {
      const testLoader = _.defaults({
        scripts: `${__dirname}/helpers/scripts/loader`,
        allowedSchemas: 'one',
        blacklist: 't1',
        whitelist: 't1',
        noWarnings: true
      }, loader);

      return massive(connectionString, testLoader).then(db => {
        assert(db);
        assert(!!db.t1 && !db.t2 && !db.tA);
        assert(!db.v1 && !db.v2);
        assert(!db.mv1 && !db.mv2);
        assert(!db.f1 && !db.f2);
        assert(!!db.one && !db.one.t1 && !db.one.t2 && !db.one.v1 && !db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!db.two);
        assert.lengthOf(db.objects, 4);
        assert.lengthOf(db.objects.filter(o => o instanceof Readable), 1);
        assert.lengthOf(db.objects.filter(o => o instanceof Writable), 1);
        assert.lengthOf(db.objects.filter(o => o instanceof Executable), 3);
        assert.lengthOf(db.objects.filter(o => o instanceof Executable && o.sql instanceof pgp.QueryFile), 1);

        return db.instance.$pool.end();
      });
    });
  });

  describe('function exclusion', function () {
    it('skips loading functions when set', function () {
      const testLoader = _.defaults({
        scripts: `${__dirname}/helpers/scripts/loader`,
        excludeFunctions: true,
        noWarnings: true
      }, loader);

      return massive(connectionString, testLoader).then(db => {
        assert.lengthOf(db.objects.filter(o => o instanceof Executable), 1);
        assert.lengthOf(db.objects.filter(o => o instanceof Executable && o.sql instanceof pgp.QueryFile), 1);

        return db.instance.$pool.end();
      });
    });

    it('loads all functions when false', function () {
      const testLoader = _.defaults({
        scripts: `${__dirname}/helpers/scripts/loader`,
        excludeFunctions: false,
        noWarnings: true
      }, loader);

      return massive(connectionString, testLoader).then(db => {
        assert.lengthOf(db.objects.filter(o => o instanceof Executable), 5);
        assert.lengthOf(db.objects.filter(o => o instanceof Executable && o.sql instanceof pgp.QueryFile), 1);

        return db.instance.$pool.end();
      });
    });
  });

  describe('function filtering', function () {
    it('blacklists functions', function () {
      const testLoader = _.defaults({
        scripts: `${__dirname}/helpers/scripts/loader`,
        functionBlacklist: '%1, one.f2',
        noWarnings: true
      }, loader);

      return massive(connectionString, testLoader).then(db => {
        assert(!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.f1 && !db.one.f2);

        return db.instance.$pool.end();
      });
    });

    it('whitelists functions', function () {
      const testLoader = _.defaults({
        scripts: `${__dirname}/helpers/scripts/loader`,
        functionWhitelist: '%1, one.f2',
        noWarnings: true
      }, loader);

      return massive(connectionString, testLoader).then(db => {
        assert(!!db.f1 && !db.f2);
        assert(!!db.one && !!db.one.f1 && !!db.one.f2);

        return db.instance.$pool.end();
      });
    });

    it('applies exceptions', function () {
      const testLoader = _.defaults({
        scripts: `${__dirname}/helpers/scripts/loader`,
        allowedSchemas: 'one',
        functionBlacklist: 'one.%1',
        exceptions: 'one.f2',
        noWarnings: true
      }, loader);

      return massive(connectionString, testLoader).then(db => {
        assert(!db.f1 && !db.f2);
        assert(!!db.one && !db.one.f1 && !!db.one.f2);

        return db.instance.$pool.end();
      });
    });
  });
});
