var assert = require("assert");
var Massive = require("../index");
var _ = require("underscore")._;
var db;

describe("Synchronous goodies", function(){
  before(function(){
    db = Massive.connectSync({db : "massive"});
  });
  it("loads", function(){
    assert(db);
  });
  it("loads our tables", function(){
    assert(db.tables.length > 0);
  });
  it("finds products", function(){
    var products = db.products.findSync();
    assert(products.length > 0);
  });
  it("finds a single product", function(){
    var product = db.products.findOneSync({id : 1});
    assert.equal(1,product.id);
  });
});
