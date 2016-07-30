var assert = require("assert");
var helpers = require("./helpers");
var massive = require("../index");

describe('Loading entities (these tests may be slow!)', function () {
  before(function (done) {
    helpers.resetDb('loader', done);
  });

  it('loads everything it can by default', function (done) {
    massive.connect({connectionString: helpers.connectionString}, function (err, db) {
      assert.ifError(err);

      assert(db);
      assert(!!db.t1 && !!db.t2 && !!db.tA);
      assert(!!db.v1 && !!db.v2);
      assert(!!db.mv1 && !!db.mv2);
      assert(!!db.f1 && !!db.f2);
      assert(!!db.one && !!db.one.t1 && !!db.one.t2 && !!db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
      assert(!!db.two && !! db.two.t1);
      assert.equal(db.tables.length, 6);
      assert.equal(db.views.length, 6);
      assert.equal(db.functions.length, 4);

      done();
    });
  });

  it('does not load tables without primary keys', function (done) {
    massive.connect({connectionString: helpers.connectionString}, function (err, db) {
      assert.ifError(err);

      assert(!db.t3); // tables without primary keys aren't loaded

      done();
    });
  });

  describe('schema filters', function () {
    it('loads everything it can with "all" schemata', function (done) {
      massive.connect({connectionString: helpers.connectionString, schema: 'all'}, function (err, db) {
        assert.ifError(err);

        assert(db);
        assert(!!db.t1 && !!db.t2 && !!db.tA);
        assert(!!db.v1 && !!db.v2);
        assert(!!db.mv1 && !!db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !!db.one.t1 && !!db.one.t2 && !!db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!!db.two && !! db.two.t1);
        assert.equal(db.tables.length, 6);
        assert.equal(db.views.length, 6);
        assert.equal(db.functions.length, 4);

        done();
      });
    });

    it('loads only entities (except public functions) from a schema string', function (done) {
      massive.connect({connectionString: helpers.connectionString, schema: 'one'}, function (err, db) {
        assert.ifError(err);

        assert(db);
        assert(!db.t1 && !db.t2 && !db.tA);
        assert(!db.v1 && !db.v2);
        assert(!db.mv1 && !db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !!db.one.t1 && !!db.one.t2 && !!db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!db.two);
        assert.equal(db.tables.length, 2);
        assert.equal(db.views.length, 2);
        assert.equal(db.functions.length, 4);

        done();
      });
    });

    it('loads only entities (except public functions) from a comma-delimited schema string', function (done) {
      massive.connect({connectionString: helpers.connectionString, schema: 'one, two'}, function (err, db) {
        assert.ifError(err);

        assert(db);
        assert(!db.t1 && !db.t2 && !db.tA);
        assert(!db.v1 && !db.v2);
        assert(!db.mv1 && !db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !!db.one.t1 && !!db.one.t2 && !!db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!!db.two && !!db.two.t1);
        assert.equal(db.tables.length, 3);
        assert.equal(db.views.length, 2);
        assert.equal(db.functions.length, 4);

        done();
      });
    });

    it('loads only entities (except public functions) from a schema array', function (done) {
      massive.connect({connectionString: helpers.connectionString, schema: [ 'one, two' ]}, function (err, db) {
        assert.ifError(err);

        assert(db);
        assert(!db.t1 && !db.t2 && !db.tA);
        assert(!db.v1 && !db.v2);
        assert(!db.mv1 && !db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !!db.one.t1 && !!db.one.t2 && !!db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!!db.two && !!db.two.t1);
        assert.equal(db.tables.length, 3);
        assert.equal(db.views.length, 2);
        assert.equal(db.functions.length, 4);

        done();
      });
    });

    it('allows exceptions', function (done) {
      massive.connect({connectionString: helpers.connectionString, schema: 'two', exceptions: 't1, v1, one.v2'}, function (err, db) {
        assert.ifError(err);

        assert(db);
        assert(!!db.t1 && !db.t2 && !db.tA);
        assert(!!db.v1 && !db.v2);
        assert(!db.mv1 && !db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.t1 && !db.one.t2 && !db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!!db.two && !!db.two.t1);
        assert.equal(db.tables.length, 2);
        assert.equal(db.views.length, 2);
        assert.equal(db.functions.length, 4);

        done();
      });
    });
  });

  describe('table blacklists', function () {
    it('excludes tables and views by a blacklist pattern string', function (done) {
      massive.connect({connectionString: helpers.connectionString, blacklist: '%1'}, function (err, db) {
        assert.ifError(err);

        assert(db);
        assert(!db.t1 && !!db.t2 && !!db.tA);
        assert(!db.v1 && !!db.v2);
        assert(!db.mv1 && !!db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.t1 && !!db.one.t2 && !db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!db.two);
        assert.equal(db.tables.length, 3);
        assert.equal(db.views.length, 3);
        assert.equal(db.functions.length, 4);

        done();
      });
    });

    it('checks schema names in the pattern', function (done) {
      massive.connect({connectionString: helpers.connectionString, blacklist: 'one.%1'}, function (err, db) {
        assert.ifError(err);

        assert(db);
        assert(!!db.t1 && !!db.t2 && !!db.tA);
        assert(!!db.v1 && !!db.v2);
        assert(!!db.mv1 && !!db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.t1 && !!db.one.t2 && !db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!!db.two && !!db.two.t1);
        assert.equal(db.tables.length, 5);
        assert.equal(db.views.length, 5);
        assert.equal(db.functions.length, 4);

        done();
      });
    });

    it('excludes tables and views from a comma-delimited blacklist', function (done) {
      massive.connect({connectionString: helpers.connectionString, blacklist: '%1, one.%2'}, function (err, db) {
        assert.ifError(err);

        assert(db);
        assert(!db.t1 && !!db.t2 && !!db.tA);
        assert(!db.v1 && !!db.v2);
        assert(!db.mv1 && !!db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.t1 && !db.one.t2 && !db.one.v1 && !db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!db.two);
        assert.equal(db.tables.length, 2);
        assert.equal(db.views.length, 2);
        assert.equal(db.functions.length, 4);

        done();
      });
    });

    it('excludes tables and views from a blacklist array', function (done) {
      massive.connect({connectionString: helpers.connectionString, blacklist: [ '%1, one.%2' ]}, function (err, db) {
        assert.ifError(err);

        assert(db);
        assert(!db.t1 && !!db.t2 && !!db.tA);
        assert(!db.v1 && !!db.v2);
        assert(!db.mv1 && !!db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.t1 && !db.one.t2 && !db.one.v1 && !db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!db.two);
        assert.equal(db.tables.length, 2);
        assert.equal(db.views.length, 2);
        assert.equal(db.functions.length, 4);

        done();
      });
    });

    it('allows exceptions', function (done) {
      massive.connect({connectionString: helpers.connectionString, blacklist: '%1', exceptions: 'one.%1'}, function (err, db) {
        assert.ifError(err);

        assert(db);
        assert(!db.t1 && !!db.t2 && !!db.tA);
        assert(!db.v1 && !!db.v2);
        assert(!db.mv1 && !!db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !!db.one.t1 && !!db.one.t2 && !!db.one.v1 && !!db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!db.two);
        assert.equal(db.tables.length, 4);
        assert.equal(db.views.length, 4);
        assert.equal(db.functions.length, 4);

        done();
      });
    });
  });

  describe('table whitelists', function () {
    it('includes only tables exactly matching a whitelist string', function (done) {
      massive.connect({connectionString: helpers.connectionString, whitelist: 't1'}, function (err, db) {
        assert.ifError(err);

        assert(db);
        assert(!!db.t1 && !db.t2 && !db.tA);
        assert(!db.v1 && !db.v2);
        assert(!db.mv1 && !db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.t1 && !db.one.t2 && !db.one.v1 && !db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!db.two);
        assert.equal(db.tables.length, 1);
        assert.equal(db.views.length, 0);
        assert.equal(db.functions.length, 4);

        done();
      });
    });

    it('includes only tables exactly matching a comma-delimited whitelist string', function (done) {
      massive.connect({connectionString: helpers.connectionString, whitelist: 't1, one.t1'}, function (err, db) {
        assert.ifError(err);

        assert(db);
        assert(!!db.t1 && !db.t2 && !db.tA);
        assert(!db.v1 && !db.v2);
        assert(!db.mv1 && !db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !!db.one.t1 && !db.one.t2 && !db.one.v1 && !db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!db.two);
        assert.equal(db.tables.length, 2);
        assert.equal(db.views.length, 0);
        assert.equal(db.functions.length, 4);

        done();
      });
    });

    it('includes only tables exactly matching a whitelist array', function (done) {
      massive.connect({connectionString: helpers.connectionString, whitelist: [ 't1', 'one.t1' ]}, function (err, db) {
        assert.ifError(err);

        assert(db);
        assert(!!db.t1 && !db.t2 && !db.tA);
        assert(!db.v1 && !db.v2);
        assert(!db.mv1 && !db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !!db.one.t1 && !db.one.t2 && !db.one.v1 && !db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!db.two);
        assert.equal(db.tables.length, 2);
        assert.equal(db.views.length, 0);
        assert.equal(db.functions.length, 4);

        done();
      });
    });
    
    it('overrides other filters', function (done) {
      massive.connect({connectionString: helpers.connectionString, schema: 'one', blacklist: 't1', whitelist: 't1'}, function (err, db) {
        assert.ifError(err);

        assert(db);
        assert(!!db.t1 && !db.t2 && !db.tA);
        assert(!db.v1 && !db.v2);
        assert(!db.mv1 && !db.mv2);
        assert(!!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.t1 && !db.one.t2 && !db.one.v1 && !db.one.v2 && !!db.one.f1 && !!db.one.f2);
        assert(!db.two);
        assert.equal(db.tables.length, 1);
        assert.equal(db.views.length, 0);
        assert.equal(db.functions.length, 4);

        done();
      });
    });
  });

  describe('function exclusion', function () {
    it('skips loading functions when set', function (done) {
      massive.connect({connectionString: helpers.connectionString, excludeFunctions: true}, function (err, db) {
        assert.ifError(err);
        assert.equal(db.functions.length, 0);
        done();
      });
    });

    it('loads all functions when false', function (done) {
      massive.connect({connectionString: helpers.connectionString, excludeFunctions: false}, function (err, db) {
        assert.ifError(err);
        assert(db.functions.length > 0);
        done();
      });
    });
  });

  describe('function blacklists', function () {
    it('excludes functions matching a blacklist pattern string', function (done) {
      massive.connect({connectionString: helpers.connectionString, functionBlacklist: '%1'}, function (err, db) {
        assert.ifError(err);
        assert(!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.f1 && !!db.one.f2);

        done();
      });
    });

    it('excludes functions matching a comma-delimited blacklist', function (done) {
      massive.connect({connectionString: helpers.connectionString, functionBlacklist: '%1, one.f2'}, function (err, db) {
        assert.ifError(err);
        assert(!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.f1 && !db.one.f2);

        done();
      });
    });

    it('excludes functions matching a blacklist array', function (done) {
      massive.connect({connectionString: helpers.connectionString, functionBlacklist: [ '%1', 'one.f2' ]}, function (err, db) {
        assert.ifError(err);
        assert(!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.f1 && !db.one.f2);

        done();
      });
    });
  });

  describe('function whitelists', function () {
    it('includes functions matching a whitelist pattern string', function (done) {
      massive.connect({connectionString: helpers.connectionString, functionWhitelist: '%1'}, function (err, db) {
        assert.ifError(err);
        assert(!!db.f1 && !db.f2);
        assert(!!db.one && !!db.one.f1 && !db.one.f2);

        done();
      });
    });

    it('includes functions matching a comma-delimited whitelist', function (done) {
      massive.connect({connectionString: helpers.connectionString, functionWhitelist: '%1, one.f2'}, function (err, db) {
        assert.ifError(err);
        assert(!!db.f1 && !db.f2);
        assert(!!db.one && !!db.one.f1 && !!db.one.f2);

        done();
      });
    });

    it('includes functions matching a whitelist array', function (done) {
      massive.connect({connectionString: helpers.connectionString, functionWhitelist: [ '%1', 'one.f2' ]}, function (err, db) {
        assert.ifError(err);
        assert(!!db.f1 && !db.f2);
        assert(!!db.one && !!db.one.f1 && !!db.one.f2);

        done();
      });
    });

    it('overlaps whitelists and blacklists', function (done) {
      massive.connect({connectionString: helpers.connectionString, functionBlacklist: 'one.%1', functionWhitelist: 'one.%'}, function (err, db) {
        assert.ifError(err);
        assert(!db.f1 && !db.f2);
        assert(!!db.one && !db.one.f1 && !!db.one.f2);

        done();
      });
    });
  });
});
