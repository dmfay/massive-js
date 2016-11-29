var assert = require("assert");
var helpers = require("./helpers");
var massive = require("../index");

describe('Loading entities (these tests may be slow!)', function () {
  before(function () {
    return helpers.resetDb('loader');
  });

  it('loads everything it can by default', function () {
    return massive.connect({
      connectionString: helpers.connectionString,
      scripts: `${__dirname}/db`
    }).then(db => {
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
    });
  });

  it('does not load tables without primary keys', function () {
    return massive.connect({
      connectionString: helpers.connectionString,
      scripts: `${__dirname}/db`
    }).then(db => {
      assert(!db.t3); // tables without primary keys aren't loaded
    });
  });

  describe('schema filters', function () {
    it('applies filters', function () {
      return massive.connect({
        connectionString: helpers.connectionString,
        scripts: `${__dirname}/db`,
        schema: "one, two"
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
        assert.equal(db.functions.length, 4);
      });
    });

    it('allows exceptions', function () {
      return massive.connect({
        connectionString: helpers.connectionString,
        scripts: `${__dirname}/db`,
        schema: "two",
        exceptions: "t1, v1, one.v2"
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
        assert.equal(db.functions.length, 4);
      });
    });
  });

  describe('table blacklists', function () {
    it('applies blacklists to tables and views', function () {
      return massive.connect({
        connectionString: helpers.connectionString,
        scripts: `${__dirname}/db`,
        blacklist: "%1, one.%2"
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
        assert.equal(db.functions.length, 4);
      });
    });

    it('checks schema names in the pattern', function () {
      return massive.connect({
        connectionString: helpers.connectionString,
        scripts: `${__dirname}/db`,
        blacklist: "one.%1"
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
        assert.equal(db.functions.length, 4);
      });
    });

    it('allows exceptions', function () {
      return massive.connect({
        connectionString: helpers.connectionString,
        scripts: `${__dirname}/db`,
        blacklist: "%1",
        exceptions: "one.%1"
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
        assert.equal(db.functions.length, 4);
      });
    });
  });

  describe('table whitelists', function () {
    it('applies a whitelist with exact matching', function () {
      return massive.connect({
        connectionString: helpers.connectionString,
        scripts: `${__dirname}/db`,
        whitelist: "t1, one.t1"
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
        assert.equal(db.functions.length, 4);
      });
    });

    it('overrides other filters', function () {
      return massive.connect({
        connectionString: helpers.connectionString,
        scripts: `${__dirname}/db`,
        schema: "one",
        blacklist: "t1",
        whitelist: "t1"
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
        assert.equal(db.functions.length, 4);
      });
    });
  });

  describe('function exclusion', function () {
    it('skips loading functions when set', function () {
      return massive.connect({
        connectionString: helpers.connectionString,
        scripts: `${__dirname}/db`,
        excludeFunctions: true
      }).then(db => {
        assert.equal(db.functions.length, 0);
      });
    });

    it('loads all functions when false', function () {
      return massive.connect({
        connectionString: helpers.connectionString,
        scripts: `${__dirname}/db`,
        excludeFunctions: false
      }).then(db => {
        assert(db.functions.length > 0);
      });
    });
  });

  describe('function filtering', function () {
    it('blacklists functions', function () {
      return massive.connect({
        connectionString: helpers.connectionString,
        scripts: `${__dirname}/db`,
        functionBlacklist: "%1, one.f2"
      }).then(db => {
        assert(!db.f1 && !!db.f2);
        assert(!!db.one && !db.one.f1 && !db.one.f2);
      });
    });

    it('whitelists functions', function () {
      return massive.connect({
        connectionString: helpers.connectionString,
        scripts: `${__dirname}/db`,
        functionWhitelist: "%1, one.f2"
      }).then(db => {
        assert(!!db.f1 && !db.f2);
        assert(!!db.one && !!db.one.f1 && !!db.one.f2);
      });
    });

    it('overlaps whitelists and blacklists', function () {
      return massive.connect({
        connectionString: helpers.connectionString,
        scripts: `${__dirname}/db`,
        functionBlacklist: "one.%1",
        functionWhitelist: "one.%"
      }).then(db => {
        assert(!db.f1 && !db.f2);
        assert(!!db.one && !db.one.f1 && !!db.one.f2);
      });
    });
  });
});
