var assert = require("assert");
var helpers = require("./helpers");
var massive = require("../index");

// JA NOTE: These tests run a little slower then most because we are connecting and
// re-loading the db with each test.

// JA NOTE: These tests can probably be improved - they seem fragile, and may not test
// enough cases.

describe('On Load with Schema Filters (these tests may run slow - loads db each test!!)', function() {
  before(function() {
    return helpers.resetDb();
  });
  it('loads all schema entities when no schema argument is passed', function() {
    return massive({connectionString: helpers.connectionString}).then(function(db) {
      assert(db);
      assert(db.products);
      assert(db.popular_products);
      assert(db.myschema.artists);
      assert(db.secrets.__secret_table);
    });
  });
  it('loads all schema entities when passed "all" as schema argument', function() {
    return massive({connectionString: helpers.connectionString}).then(function(db) {
      assert(db);
      assert(db.products);
      assert(db.popular_products);
      assert(db.myschema.artists);
      assert(db.secrets.__secret_table);
    });
  });
  it('loads only entities from specified schema when passed schema name as schema argument', function() {
    return massive({connectionString: helpers.connectionString, schema: ['myschema']}).then(function(db) {
      assert(db.myschema.artists);
      assert(db.myschema.top_artists);
    });
  });
  it('loads only entities from public schema when passed "public" name as schema argument', function() {
    // TODO - other schema may still be present until function filters are in place...
    // Can't just test for non-presence of other schema on db - gotta test for non-presence of tables
    // from other schema. This will be cleaned up shortly.
    return massive({connectionString: helpers.connectionString, schema: ['public']}).then(function(db) {
      assert(!db.myschema);
      assert(db.products);
    });
  });
  it('loads only entities from specified schema when passed comma-delimited list of schema names', function() {
    return massive({connectionString: helpers.connectionString, schema: ['myschema', 'secrets']}).then(function(db) {

      assert(!db.products);
      assert(db.myschema.artists);
      assert(db.myschema.top_artists);
      assert(db.secrets.__secret_table);
    });
  });
});

describe('On Load with Table blacklist (these tests may run slow - loads db each test!!)', function() {
  it('loads all entities when no blacklist argument is provided', function() {
    return massive({connectionString: helpers.connectionString}).then(function(db) {
      assert(db);
      assert(db.products);
      assert(db.popular_products);
      assert(db.myschema.artists);
      assert(db.secrets.__secret_table);
    });
  });
  it('excludes entities with name matching blacklist pattern as a string argument', function() {
    return massive({connectionString: helpers.connectionString, tablesExcludes: ["%prod%"], viewsExcludes: ["%prod%"]}).then(function(db) {
      assert(db);
      assert(!db.products);
      assert(!db.popular_products);
      assert(db.myschema.artists);
      assert(db.secrets.__secret_table);
    });
  });
  it('excludes tables with name and schema matching blacklist pattern as a string argument', function() {
    return massive({connectionString: helpers.connectionString, tablesExcludes: ["secrets.__semi%"]}).then(function(db) {
      assert(db.products);
      assert(db.myschema.artists);
      assert(db.secrets.__secret_table);
      assert(!db.secrets.__semi_secret_table);
    });
  });
  it('excludes views with name and schema matching blacklist pattern as a string argument', function() {
    return massive({connectionString: helpers.connectionString, viewsExcludes: ["myschema.top%"]}).then(function(db) {
      assert(db.products);
      assert(db.myschema.artists);
      assert(!db.myschema.top_artists);
      assert(db.secrets.__secret_table);
      assert(db.secrets.__semi_secret_table);
    });
  });
  it('excludes entities with name and schema matching multiiple blacklist patterns as a comma-delimited string argument', function() {
    return massive({connectionString: helpers.connectionString, tablesExcludes: ["secrets.__semi%","%prod%"], viewsExcludes:["secrets.__semi%","%prod%"] }).then(function(db) {
      assert(!db.products);
      assert(!db.popular_products);
      assert(db.myschema.artists);
      assert(db.secrets.__secret_table);
      assert(!db.secrets.__semi_secret_table);
    });
  });
  it('allows table exceptions to schema filter', function() {
    return massive({connectionString: helpers.connectionString, schema: ['myschema'], tablesIncludes: ['products']}).then(function(db) {
      assert(db.products);
      assert(db.myschema.artists);
    });
  });
  it('allows view exceptions to schema filter', function() {
    return massive({connectionString: helpers.connectionString, schema: ['myschema'], tablesIncludes: ['popular_products']}).then(function(db) {
      assert(!db.products);
      assert(db.popular_products);
      assert(db.myschema.artists);
    });
  });
  it('allows exceptions to blacklist filter', function() {
    return massive({connectionString: helpers.connectionString, blacklist: 'myschema.a%', exceptions: 'myschema.artists'}).then(function(db) {
      assert(db.products);
      assert(db.myschema.artists);
    });
  });
  it('allows exceptions to schema and blacklist filters', function(done) {
    massive.connect({connectionString: helpers.connectionString, schema: 'myschema', blacklist: 'secrets.__%', exceptions: 'products, secrets.__secret_table'}, function(err, db) {
      assert.ifError(err);
      assert(db.products);
      assert(db.myschema.artists);
      assert(db.secrets.__secret_table);
      assert(!db.secrets.__semi_secret_table);
      assert.equal(db.tables.length, 5);
      assert.equal(db.views.length, 1);
      done();
    });
  });
});

describe('On Load with Table whitelist (these tests may run slow - loads db each test!!)', function() {
  it('loads all tables when no whitelist argument is provided', function(done) {
    massive.connect({connectionString: helpers.connectionString}, function(err, db) {
      assert.ifError(err);
      assert(db.products && db.myschema.artists && db.secrets.__secret_table && db.tables.length == 9);
      done();
    });
  });
  it('includes ONLY tables with name matching whitelisted table names as a string argument', function(done) {
    massive.connect({connectionString: helpers.connectionString, whitelist: "products"}, function(err, db) {
      assert.ifError(err);
      assert(db.products && db.tables.length == 1);
      done();
    });
  });
  it('includes ONLY tables with name matching whitelisted items in comma-delimited string', function(done) {
    massive.connect({connectionString: helpers.connectionString, whitelist: 'products, myschema.artists'}, function(err, db) {
      assert.ifError(err);
      assert(db.products && db.myschema.artists && db.tables.length == 2);
      done();
    });
  });
  it('includes ONLY tables with name matching whitelisted items in string array', function(done) {
    massive.connect({connectionString: helpers.connectionString, whitelist: ['products', 'myschema.artists']}, function(err, db) {
      assert.ifError(err);
      assert(db.products && db.myschema.artists && db.tables.length == 2);
      done();
    });
  });
  it('whitelist overrides other filters', function(done) {
    massive.connect({connectionString: helpers.connectionString, schema: 'myschema', blacklist: 'a%', whitelist: 'products, secrets.__secret_table'}, function(err, db) {
      assert.ifError(err);
      assert(db.products && !db.myschema.artists && db.secrets.__secret_table && db.tables.length == 2);
      done();
    });
  });
});

describe('On load with Function Exclusion (these tests may run slow - loads db each test!!)', function() {
  it('excludes functions at load whenever it is told...', function(done) {
    massive.connect({connectionString: helpers.connectionString, excludeFunctions: true}, function(err, db) {
      assert.ifError(err);
      assert.equal(db.functions.length, 0);
      done();
    });
  });
  it('includes all functions at load whenever it is told...', function(done) {
    massive.connect({connectionString: helpers.connectionString, excludeFunctions: false}, function(err, db) {
      assert.ifError(err);
      assert(db.functions.length > 0);
      done();
    });
  });
  it('includes all functions at load by default...', function(done) {
    massive.connect({connectionString: helpers.connectionString}, function(err, db) {
      assert.ifError(err);
      assert(db.functions.length > 0);
      done();
    });
  });
});

describe('On load with Function Blacklist (these tests may run slow - loads db each test!!)', function() {
  it('loads all functions when no blacklist argument is provided', function(done) {
    massive.connect({connectionString: helpers.connectionString}, function(err, db) {
      assert.ifError(err);
      assert(db.AllMyProducts && db.all_products && db.myschema.AllMyAlbums && db.myschema.all_albums && db.myschema.artist_by_name);
      done();
    });
  });
  it('excludes functions with name matching blacklist pattern as a string argument', function(done) {
    massive.connect({connectionString: helpers.connectionString, functionBlacklist: "all_%"}, function(err, db) {
      assert.ifError(err);
      assert(!db.all_products && db.AllMyProducts);
      done();
    });
  });
  it('excludes functions with name and schema matching blacklist pattern as a string argument', function(done) {
    massive.connect({connectionString: helpers.connectionString, functionBlacklist: "myschema.all_%"}, function(err, db) {
      assert.ifError(err);
      assert(!db.myschema.all_albums && db.myschema.artist_by_name && db.all_products);
      done();
    });
  });
  it('excludes functions with name and schema matching multiiple blacklist patterns as a comma-delimited string argument', function(done) {
    massive.connect({connectionString: helpers.connectionString, functionBlacklist: "myschema.artist_%, all_%"}, function(err, db) {
      assert.ifError(err);
      assert(!db.myschema.artist_by_name && !db.all_products && db.myschema.all_albums && db.AllMyProducts);
      done();
    });
  });
  it('excludes functions with name and schema matching multiiple blacklist patterns as a string array argument', function(done) {
    massive.connect({connectionString: helpers.connectionString, functionBlacklist: ["myschema.artist_%", "all_%"]}, function(err, db) {
      assert.ifError(err);
      assert(!db.myschema.artist_by_name && !db.all_products && db.myschema.all_albums && db.AllMyProducts);
      done();
    });
  });
});
