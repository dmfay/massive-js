var assert = require("assert");
var helpers = require("./helpers");
var massive = require("../index");
// var db;

var syncLoaded;
var constr = "postgres://rob:password@localhost/massive";
var path = require("path");
var scriptsDir = path.join(__dirname, ".", "db");

describe('On Load with Schema Filters', function () {
  
  before(function(done){
    helpers.resetDb(function(err,res){
      // db = res;
      done()
    });
  });  
  it('loads all schema tables when no allowedSchemas argument is passed', function (done) { 
    massive.connect({connectionString: constr}, function (err, db) { 
      assert(db && db.products && db.myschema.artists && db.secrets.__secret_table && db.tables.length == 8);
      done();
    });
  });
  it('loads all schema tables when passed "all" as allowedSchemas argument', function (done) { 
    massive.connect({connectionString: constr, allowedSchemas: 'all'}, function (err, db) { 
      assert(db && db.products && db.myschema.artists && db.secrets.__secret_table && db.tables.length == 8);
      done();
    });
  });
  it('loads only tables from specified schema when passed schema name as allowedSchemas argument', function (done) { 
    massive.connect({connectionString: constr, allowedSchemas: 'myschema'}, function (err, db) { 
      assert(db.myschema.artists && db.tables.length == 3);
      done();
    });
  });
  it('loads only tables from public schema when passed "public" name as allowedSchemas argument', function (done) { 
    // TODO - other schema may still be present until function filters are in place...
    // Can;t just test for non-presence of other schema on db - gotta test for non-presence of tables
    // from other schema. This will be cleaned up shortly. 
    massive.connect({connectionString: constr, allowedSchemas: 'public'}, function (err, db) { 
      assert(!db.myschema.artists && db.products && db.tables.length == 3);
      done();
    });
  });
  it('loads only tables from specified schema when passed comma-delimited list of schema names', function (done) { 
    massive.connect({connectionString: constr, allowedSchemas: ['myschema, secrets']}, function (err, db) { 
      assert(!db.products && db.myschema.artists && db.secrets.__secret_table && db.tables.length == 5);
      done();
    });
  });
  it('loads only tables from specified schema when passed an array of schema names', function (done) { 
    massive.connect({connectionString: constr, allowedSchemas: ['myschema', 'secrets']}, function (err, db) { 
      assert(!db.products && db.myschema.artists && db.secrets.__secret_table && db.tables.length == 5);
      done();
    });
  });
});



describe('Synchronous Load', function () {
  

});
