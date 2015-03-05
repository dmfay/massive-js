var assert = require("assert");
var helpers = require("./helpers");
var db;

describe('Tables', function () {
  
  before(function(done){
    helpers.resetDb(function(err,res){
      db = res;
      done();
    });
  });
  describe('Simple queries with args', function () {
    it('returns product 1 with 1 as only arg', function (done) {
      db.products.find(1, function(err,res){
        assert.equal(res.id, 1);
        done();
      });
    });
    it('returns CamelCase 1 with 1 as only arg', function (done) {
      db.CamelCaseTable.find(1, function(err,res){
        assert.equal(res.Id, 1); //camel cased column name
        done();
      });
    });
    it('returns first record with findOne no args', function (done) {
      db.products.findOne(1, function(err,res){
        assert.equal(res.id, 1);
        done();
      });
    });
    it('returns first CamelCase record with findOne no args', function (done) {
      db.CamelCaseTable.findOne(1, function(err,res){
        assert.equal(res.Id, 1); //camel cased column name
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
    it('returns all records from a CamelCase table with no args', function (done) {
      db.CamelCaseTable.find(function(err,res){
        assert.equal(res.length, 2);
        done();
      });
    });
    it('returns first record with findOne no args', function (done) {
      db.products.findOne(function(err,res){
        assert.equal(res.id, 1);
        done();
      });
    });
    it('returns first record with findOne on CamelCase no args', function (done) {
      db.CamelCaseTable.findOne(function(err,res){
        assert.equal(res.Id, 1); //camel cased column name
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
      db.Users.find({}, function(err,res){
        assert.equal(res.length, 1);
        done();
      });
    });
  });
});