var assert = require("assert");
var helpers = require("./helpers");
var _ = require("underscore")._;
var db;



describe('Tables -Add/Edit/Delete', function () {
  
  //Separate 'suite' for add/edit/delete so query tests don't get borked:
  before(function(done){
    helpers.resetDb(function(err,res){
      db = res;
      done();
    });
  });

  describe('Add/Update/Delete records:', function() {
    it('adds a product ', function (done) {
      db.products.save({name : "Gibson Les Paul", description : "Lester's brain child", price : 3500}, function(err, res){
        assert.equal(res.id, 4);
        done();
      });
    });
    it('updates a product', function (done) {
      var product = {id : 4, name : "Fender Stratocaster", description : "Leo Fender's baby", price : 1200, tags: ['1', '2']};
      db.products.save(product, function(err, res){
        // Update returns an array - Iassume because more than one item can be updated...
        assert.equal(product.id, 4);  // should not clobber the original object
        assert.equal(res[0].name, "Fender Stratocaster");
        done();
      });
    });
    it('updates multiple products', function (done) {
      db.products.update({in_stock: true}, {in_stock: false}, function(err, res) {
        assert.equal(res.length, 2);
        assert.equal(res[0].id, 1);
        assert.equal(res[0].in_stock, false);
        assert.equal(res[1].id, 2);
        assert.equal(res[1].in_stock, false);
        done();
      });
    });
    it('updates all products', function (done) {
      db.products.update({}, {price: 1.23}, function(err, res) {
        assert.equal(res.length, 4);
        assert.equal(res[0].price, 1.23);
        assert.equal(res[1].price, 1.23);
        assert.equal(res[2].price, 1.23);
        assert.equal(res[3].price, 1.23);
        done();
      });
    });
    it('updates multiple products with an IN list', function (done) {
      db.products.update({id: [1, 2]}, {price: 123.45}, function(err, res) {
        assert.equal(res.length, 2);
        assert.equal(res[0].id, 1);
        assert.equal(res[0].price, 123.45);
        assert.equal(res[1].id, 2);
        assert.equal(res[1].price, 123.45);
        done();
      });
    });
    it('updates multiple products with a NOT IN list', function (done) {
      db.products.update({'id !=': [1, 2]}, {price: 543.21}, function(err, res) {
        assert.equal(res.length, 2);
        assert.equal(res[0].id, 3);
        assert.equal(res[0].price, 543.21);
        assert.equal(res[1].id, 4);
        assert.equal(res[1].price, 543.21);
        done();
      });
    });
    it('deletes a product ', function (done) {
      db.products.destroy({id : 4}, function(err, deleted){
        var remaining = db.products.find(4, function(err, found) { 
          //Deleted returns an array...
          assert(found === undefined && deleted[0].id === 4);
          done();
        });
      });
    });
    it('deletes all products', function (done) {
      db.products.destroy({}, function(err, deleted){
        var remaining = db.products.find({}, function(err, found) { 
          assert.equal(deleted.length, 3);
          assert.equal(found.length, 0);
          done();
        });
      });
    });
  });

  describe('Add/Update/Delete records with nonstandard casing:', function() {
    it('adds a User ', function (done) {
      db.Users.save({Email : "foo@bar.com", Name: "Another test user"}, function(err, res){
        assert.equal(res.Id, 2);
        assert.equal(res.Email, "foo@bar.com");
        done();
      });
    });
    it('updates a User ', function (done) {
      db.Users.save({Id : 2, Email : "bar@foo.com"}, function(err, res){
        // Update returns an array
        assert.equal(res[0].Email, "bar@foo.com");
        done();
      });
    });
    it('deletes a User ', function (done) {
      db.Users.destroy({Id : 2}, function(err, deleted){
        var remaining = db.Users.find(2, function(err, found) { 
          //Deleted returns an array...
          assert(found === undefined && deleted[0].Id == 2);
          done();
        });
      });
    });
  });

  describe('Add/Update/Delete records with UUID keys:', function() {
    it('adds an order', function (done) {
      db.orders.save({product_id: 1, user_id: 1, notes: 'hi'}, function(err, res) {
        assert.ok(res.id !== null);
        assert.equal(res.product_id, 1);
        assert.equal(res.user_id, 1);
        assert.equal(res.notes, 'hi');
        done();
      });
    });

    it('updates an order', function (done) {
      db.orders.findOne({}, function(err, found) { 
        if (err) { throw err; }
        
        found.notes = 'hello';

        db.orders.save(found, function(err, res) {
          assert.equal(res.length, 1);
          assert.equal(res[0].notes, 'hello');
          done();
        });
      });
    });

    it('deletes an order', function (done) {
      db.orders.findOne({}, function(err, found) { 
        if (err) { throw err; }

        db.orders.destroy({id : found.id}, function(err, deleted) {
          db.orders.findOne({id : found.id}, function(err, remaining) { 
            assert.equal(deleted[0].id, found.id);
            assert.ok(remaining === undefined);
            done();
          });
        });
      });
    });
  });
});

describe('Tables', function () {
  
  before(function(done){
    helpers.resetDb(function(err,res){
      db = res;
      done();
    });
  });

  describe("Executing inline SQL", function () {
    it('with run and no args returns 3 products', function (done) {
      db.run("select * from products", function(err,res){
        assert.equal(3, res.length)
        done()
      });
    });
    it('with run and id returns Product 1', function (done) {
      db.run("select * from products where id=$1",[1], function(err,res){
        assert.equal(1, res[0].id)
        done()
      });
    });
  });
  describe('Simple queries with args', function () {
    it('returns product 1 with 1 as only arg', function (done) {
      db.products.find(1, function(err,res){
        assert.equal(res.id, 1);
        done();
      });
    });
    it('returns first record with findOne no args', function (done) {
      db.products.findOne(1, function(err,res){
        assert.equal(res.id, 1);
        done();
      });
    });
  });
  describe('Simple queries without args', function () {
    it('returns all records on find with no args', function (done) {
      db.products.find(function(err,res){
        assert.equal(res.length, 3);
        done();
      });
    });
    it('returns first record with findOne no args', function (done) {
      db.products.findOne(function(err,res){
        assert.equal(res.id, 1);
        done();
      });
    });
  });
  describe('Simple queries with AND and OR', function () {
    it('returns Product 1 OR Product 2', function (done) {
      db.products.where("id=$1 OR id=$2", [1,2],function(err,res){
        assert.equal(res.length, 2);
        done();
      });
    });
    it('returns Product 1 AND Product 2', function (done) {
      db.products.where("id=$1 AND price=$2", [1,12.00],function(err,res){
        assert.equal(res.length, 1);
        done();
      });
    });
    it('returns Product 1 with params as not array', function (done) {
      db.products.where("id=$1", 1,function(err,res){
        assert.equal(res.length, 1);
        done();
      });
    });
  });
  describe('Simple queries with count', function () {
    it('returns 2 for OR id 1 or 2', function (done) {
      db.products.count("id=$1 OR id=$2", [1,2], function(err,res){
        assert.equal(res,2);
        done();
      });
    });
    it('returns 1 for id 1', function (done) {
      db.products.count("id=$1", [1], function(err,res){
        assert.equal(res, 1);
        done();
      });
    });
  });
  describe('More abstracted queries using findArgs in count', function () {
    it('returns 2 for OR id 1 or 2', function (done) {
      db.products.count({id: [1, 2]}, function(err,res){
        assert.equal(res,2);
        done();
      });
    });
    it('returns 1 for id 1', function (done) {
      db.products.count({id: 1}, function(err,res){
        assert.equal(res, 1);
        done();
      });
    });
    it('returns 3 for everything', function (done) {
      db.products.count({}, function(err,res){
        assert.equal(res, 3);
        done();
      });
    });
  });
  describe('Simple comparative queries', function () {
    it('returns product with id greater than 2', function (done) {
      db.products.find({"id > " : 2}, function(err,res){
        assert.equal(res[0].id, 3);
        done();
      });
    });
    it('returns product with id less than 2', function (done) {
      db.products.find({"id < " : 2}, function(err,res){
        assert.equal(res[0].id, 1);
        done();
      });
    });
    it('returns products IN 1 and 2', function (done) {
      db.products.find({id : [1,2]}, function(err,res){
        assert.equal(res[0].id, 1);
        done();
      });
    });
    it('returns product NOT IN 1 and 2', function (done) {
      db.products.find({"id <>" : [1,2]}, function(err,res){
        assert.equal(res[0].id, 3);
        done();
      });
    });
    it('returns products by finding a null field', function (done) {
      db.products.find({"tags": null}, function(err,res){
        assert.equal(res.length, 3);
        assert.equal(res[0].id, 1);
        done();
      });
    });
    it('returns products by finding a non-null field', function (done) {
      db.products.find({"id != ": null}, function(err,res){
        assert.equal(res.length, 3);
        assert.equal(res[0].id, 1);
        done();
      });
    });
    it('returns products with a compound query including a null field', function (done) {
      db.products.find({"id": 1, "tags": null, price: 12.00}, function(err,res){
        assert.equal(res.length, 1);
        assert.equal(res[0].id, 1);
        done();
      });
    });
  });
  describe('Limiting and Offsetting results', function () {
    it('returns 1 result with limit of 1', function (done) {
      db.products.find(null,{limit : 1}, function(err,res){
        assert.equal(res.length, 1);
        done();
      });
    });
    it('returns second result with limit of 1, offset of 1', function (done) {
      db.products.find({},{limit : 1, offset: 1}, function(err,res){
        assert.equal(res[0].id, 2);
        done();
      });
    });
    it('returns id and name if sending in columns', function (done) {
      db.products.find({},{columns :["id","name"]}, function(err,res){
        var keys = _.keys(res[0]);
        assert.equal(keys.length,2);
        done();
      });
    });
  });

  describe('Ordering results', function () {
    it('returns ascending order of products by price', function (done) {
      db.products.find({}, {order : "price"}, function(err,res){
        assert.equal(res.length, 3);
        assert.equal(res[0].id, 1);
        assert.equal(res[2].id, 3);
        done();
      });
    });
    it('returns descending order of products', function (done) {
      db.products.find({},{order : "id desc"}, function(err,res){
        assert.equal(res.length, 3);
        assert.equal(res[0].id, 3);
        assert.equal(res[2].id, 1);
        done();
      });
    });
  });
  describe('Casing issues', function () {
    it('returns users because we delimit OK', function (done) {
      db.Users.find({}, function(err, res){
        assert.equal(res.length, 1);
        done();
      });
    });
    it('returns the first user because we delimit OK', function (done) {
      db.Users.findOne(function(err,res){
        assert.equal(res.Id, 1);
        done();
      });
    });
    it('returns a subset of columns, when we delimit in the calling code', function (done) {
      db.Users.find({},{columns: ['"Id"','"Email"']}, function(err, res){
        assert.equal(res.length, 1);
        done();
      });
    });
    it('returns a single column, when we delimit in the calling code', function (done) {
      db.Users.find({},{columns: '"Email"'}, function(err, res){
        assert.equal(res.length, 1);
        done();
      });
    });
    it('returns users with a simple order by', function (done) {
      db.Users.find({}, {order: '"Email"'}, function(err, res){
        assert.equal(res.length, 1);
        done();
      });
    });
    it('returns users with a compound order by', function (done) {
      db.Users.find({}, {order: '"Email" asc, "Id" desc'}, function(err, res){
        assert.equal(res.length, 1);
        done();
      });
    });
    it('counts all funny cased users', function (done) {
      db.Users.count(null, null, function(err, res){
        assert.equal(res, 1);
        done();
      });
    });
    it('counts funny cased users when we use a where and delimit the condition', function (done) {
      db.Users.count('"Email"=$1', ["test@test.com"], function(err, res){
        assert.equal(res, 1);
        done();
      });
    });
    it('returns users when we use a simple where', function (done) {
      db.Users.where('"Email"=$1', ["test@test.com"], function(err, res){
        assert.equal(res.length, 1);
        done();
      });
    });
  });
  describe('Full Text search', function () {
    it('returns 3 products for term "product"', function (done) {
      db.products.search({columns : ["name"], term: "Product"},function(err,res){
        assert.equal(res.length,3);
        done();
      });
    });
    it('returns 1 products for term "3"', function (done) {
      db.products.search({columns : ["name"], term: "3"},function(err,res){
        assert.equal(res.length,1);
        done();
      });
    });
    it('returns 1 Users for term "test"', function (done) {
      db.Users.search({columns : ["Name"], term: "test"},function(err,res){
        assert.equal(res.length,1);
        done();
      });
    });
  });

  describe('Streaming Results', function () {
    it('returns a readable stream', function (done) {
      db.products.find({}, {stream: true}, function(err, stream) {
        assert.ok(err === null);

        var result = [];

        stream.on('readable', function() {
          var res = stream.read();

          if (res) {
            result.push(res);
          }
        });

        stream.on('end', function () {
          assert.equal(3, result.length);
          done();
        });
      });
    });
  });

  describe('insert', function () {
    it('inserts a product', function (done) {
      db.products.insert({name: "A Product"}, function (err, res) {
        assert.equal(res.name, "A Product");

        done();
      });
    });

    it('inserts multiple products', function (done) {
      db.products.insert([{name: "A Product"}, {name: "Another Product"}], function (err, res, res2) {
        assert.equal(res.length, 2);
        assert.equal(res[0].name, "A Product");
        assert.equal(res[1].name, "Another Product");

        done();
      });
    });

    it('inserts array fields', function (done) {
      db.products.insert({name: "A Product", tags: ['one', 'two']}, function (err, res) {
        assert.equal(res.name, "A Product");
        assert.deepEqual(res.tags, ['one', 'two']);

        done();
      });
    });
  });
});