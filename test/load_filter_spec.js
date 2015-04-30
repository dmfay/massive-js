var assert = require("assert");
var helpers = require("./helpers");
var massive = require("../index");

var constr = "postgres://rob:password@localhost/massive";
var path = require("path");
var scriptsDir = path.join(__dirname, ".", "db");

// JA NOTE: These tests run a little slower then most because we are connecting and 
// re-loading the db with each test. 

// JA NOTE: These tests can probably be improved - they seem fragile, and may not test
// enough cases. 

describe('On Load with Schema Filters', function () {
  before(function(done){
    helpers.resetDb(function(err,res){
      // db = res;
      done()
    });
  });  
  it('loads all schema tables when no schema argument is passed', function (done) { 
    massive.connect({connectionString: constr}, function (err, db) { 
      assert(db && db.products && db.myschema.artists && db.secrets.__secret_table && db.tables.length == 8);
      done();
    });
  });
  it('loads all schema tables when passed "all" as schema argument', function (done) { 
    massive.connect({connectionString: constr, schema: 'all'}, function (err, db) { 
      assert(db && db.products && db.myschema.artists && db.secrets.__secret_table && db.tables.length == 8);
      done();
    });
  });
  it('loads only tables from specified schema when passed schema name as schema argument', function (done) { 
    massive.connect({connectionString: constr, schema: 'myschema'}, function (err, db) { 
      assert(db.myschema.artists && db.tables.length == 3);
      done();
    });
  });
  it('loads only tables from public schema when passed "public" name as schema argument', function (done) { 
    // TODO - other schema may still be present until function filters are in place...
    // Can't just test for non-presence of other schema on db - gotta test for non-presence of tables
    // from other schema. This will be cleaned up shortly. 
    massive.connect({connectionString: constr, schema: 'public'}, function (err, db) { 
      assert(!db.myschema.artists && db.products && db.tables.length == 3);
      done();
    });
  });
  it('loads only tables from specified schema when passed comma-delimited list of schema names', function (done) { 
    massive.connect({connectionString: constr, schema: ['myschema, secrets']}, function (err, db) { 
      assert(!db.products && db.myschema.artists && db.secrets.__secret_table && db.tables.length == 5);
      done();
    });
  });
  it('loads only tables from specified schema when passed an array of schema names', function (done) { 
    massive.connect({connectionString: constr, schema: ['myschema', 'secrets']}, function (err, db) { 
      assert(!db.products && db.myschema.artists && db.secrets.__secret_table && db.tables.length == 5);
      done();
    });
  });
});



describe('On Load with Table blacklist', function () {
  it('loads all tables when no blacklist argument is provided', function (done) { 
    massive.connect({connectionString: constr}, function (err, db) { 
      assert(db.products && db.myschema.artists && db.secrets.__secret_table && db.tables.length == 8);
      done();
    });
  });
  it('excludes tables with name matching blacklist pattern as a string argument', function (done) { 
    massive.connect({connectionString: constr, blacklist: "prod%"}, function (err, db) { 
      assert(!db.products && db.myschema.artists && db.secrets.__secret_table && db.tables.length == 7);
      done();
    });
  });
  it('excludes tables with name and schema matching blacklist pattern as a string argument', function (done) { 
    massive.connect({connectionString: constr, blacklist: "secrets.__semi%"}, function (err, db) { 
      assert(db.products && db.myschema.artists && db.secrets.__secret_table && !db.secrets.__semi_secret_table && db.tables.length == 7);
      done();
    });
  });
  it('excludes tables with name and schema matching multiiple blacklist patterns as a comma-delimited string argument', function (done) { 
    massive.connect({connectionString: constr, blacklist: "secrets.__semi%, prod%"}, function (err, db) { 
      assert(!db.products && db.myschema.artists && db.secrets.__secret_table && !db.secrets.__semi_secret_table && db.tables.length == 6);
      done();
    });
  });
  it('excludes tables with name and schema matching multiiple blacklist patterns as a string array argument', function (done) { 
    massive.connect({connectionString: constr, blacklist: ['secrets.__semi%', 'prod%']}, function (err, db) { 
      assert(!db.products && db.myschema.artists && db.secrets.__secret_table && !db.secrets.__semi_secret_table && db.tables.length == 6);
      done();
    });
  });
  it('allows exceptions to schema filter', function (done) { 
    massive.connect({connectionString: constr, schema: 'myschema', exceptions: 'products'}, function (err, db) { 
      assert(db.products && db.myschema.artists && db.tables.length == 4);
      done();
    });
  });
  it('allows exceptions to blacklist filter', function (done) { 
    massive.connect({connectionString: constr, blacklist: 'myschema.a%', exceptions: 'myschema.artists'}, function (err, db) { 
      assert(db.products && db.myschema.artists && db.tables.length == 7);
      done();
    });
  });
  it('allows exceptions to schema and blacklist filters', function (done) { 
    massive.connect({connectionString: constr, schema: 'myschema', blacklist: 'secrets.__%', exceptions: 'products, secrets.__secret_table'}, function (err, db) { 
      assert(db.products && db.myschema.artists && db.secrets.__secret_table && !db.secrets.__semi_secret_table && db.tables.length == 5);
      done();
    });
  });
});

describe('On Load with Table whitelist', function () {
  it('loads all tables when no whitelist argument is provided', function (done) { 
    massive.connect({connectionString: constr}, function (err, db) { 
      assert(db.products && db.myschema.artists && db.secrets.__secret_table && db.tables.length == 8);
      done();
    });
  });
  it('includes ONLY tables with name matching whitelisted table names as a string argument', function (done) { 
    massive.connect({connectionString: constr, whitelist: "products"}, function (err, db) { 
      assert(db.products && db.tables.length == 1);
      done();
    });
  });
  it('includes ONLY tables with name matching whitelisted items in comma-delimited string', function (done) { 
    massive.connect({connectionString: constr, whitelist: 'products, myschema.artists'}, function (err, db) { 
      assert(db.products && db.myschema.artists && db.tables.length == 2);
      done();
    });
  });
  it('includes ONLY tables with name matching whitelisted items in string array', function (done) { 
    massive.connect({connectionString: constr, whitelist: ['products', 'myschema.artists']}, function (err, db) { 
      assert(db.products && db.myschema.artists && db.tables.length == 2);
      done();
    });
  });
  it('whitelist overrides other filters', function (done) { 
    massive.connect({connectionString: constr, schema: 'myschema', blacklist: 'a%', whitelist: 'products, secrets.__secret_table'}, function (err, db) { 
      assert(db.products && !db.myschema.artists && db.secrets.__secret_table && db.tables.length == 2);
      done();
    });
  });
});
  

