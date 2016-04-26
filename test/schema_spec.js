var assert = require("assert");
var helpers = require("./helpers");
var _ = require("underscore")._;
var db;

describe('Schema', function() {
  var schemaName = 'spec';
  var tableName = 'doggies';
  var schemaTableName = schemaName + '.' + tableName;

  before(function(done) {
    helpers.resetDb(function(err,res){
      db = res;
      done();
    });
  });

  describe('create', function() {

    after(function(done) {
      db.dropSchema(schemaName, {cascade: true}, function(err) {
        assert.ifError(err);
        assert.equal(db[schemaName], undefined);
        done();
      });
    });

    it('adds a new schema', function(done) {
      db.createSchema(schemaName, function(err) {
        assert.ifError(err);
        assert(_.isEqual(db[schemaName], {}), 'should be an empty object');
        done();
      });
    });

  });

  describe('drop', function() {

    beforeEach(function(done) {
      db.createSchema(schemaName, function(err) {
        assert.ifError(err);
        db.createDocumentTable(schemaTableName, function(err) {
          assert.ifError(err);
          done();
        });
      });
    });

    after(function(done) {
      db.dropSchema(schemaName, {cascade: true}, function(err) {
        assert.ifError(err);
        done();
      });
    });

    it('removes a schema and underlying table with cascade option', function(done) {
      db.dropSchema(schemaName, {cascade: true}, function(err) {
        assert.ifError(err);
        assert.equal(db[schemaName], undefined);
        done();
      });
    });

    it('fails to remove schema and underlying tables without cascade', function(done) {
      db.dropSchema(schemaName, {cascade: false}, function(err) {
        assert(err !== null, 'should callback with error');
        done();
      });
    });

  });

});


describe('Schema - Bound Tables -Add/Edit/Delete', function () {

  //Separate 'suite' for add/edit/delete so query tests don't get borked:
  before(function(done){
    helpers.resetDb(function(err,res){
      db = res;
      done();
    });
  });

  describe('Add/Update/Delete records in a schema-bound table:', function() {
    it('adds an artist ', function (done) {
      db.myschema.artists.save({name : "Nirvana"}, function(err, res){
        assert.ifError(err);
        assert.equal(res.id, 4);
        done();
      });
    });
    it('updates an artist ', function (done) {
      db.myschema.artists.save({id : 4, name : "The Wipers"}, function(err, res){
        assert.ifError(err);
        assert.equal(res.id, 4);
        assert.equal(res.name, "The Wipers");
        done();
      });
    });
    it('deletes an artist ', function (done) {
      db.myschema.artists.destroy({id : 4}, function(err, deleted){
        assert.ifError(err);
        db.myschema.artists.find(4, function(err, found) {
          assert.ifError(err);
          assert(deleted[0].id == 4 && found == undefined);
        });
        done();
      });
    });
  });

});

describe('Schema - Bound Tables -Querying', function () {

  before(function(done){
    helpers.resetDb(function(err,res){
      db = res;
      done();
    });
  });

  describe('Simple queries with args', function () {
    it('returns Artist 1 with 1 as only arg', function (done) {
      db.myschema.artists.find(1, function(err,res){
        assert.ifError(err);
        assert.equal(res.id, 1);
        done();
      });
    });
    it('returns first record with findOne no args', function (done) {
      db.myschema.artists.findOne(1, function(err,res){
        assert.ifError(err);
        assert.equal(res.id, 1);
        done();
      });
    });
  });
  describe('Simple queries without args', function () {
    it('returns all records on find with no args', function (done) {
      db.myschema.artists.find(function(err,res){
        assert.ifError(err);
        assert.equal(res.length, 3);
        done();
      });
    });
    it('returns first record with findOne no args', function (done) {
      db.myschema.artists.findOne(function(err,res){
        assert.ifError(err);
        assert.equal(res.id, 1);
        done();
      });
    });
  });
  describe('Simple queries with AND and OR', function () {
    it('returns Artist 1 OR Artist 2', function (done) {
      db.myschema.artists.where("id=$1 OR id=$2", [1,2],function(err,res){
        assert.ifError(err);
        assert.equal(res.length, 2);
        done();
      });
    });
    it('returns Artist 1 AND Artist 2', function (done) {
      db.myschema.artists.where("id=$1 AND name=$2", [3, "Sex Pistols"],function(err,res){
        assert.ifError(err);
        assert.equal(res.length, 1);
        done();
      });
    });
    it('returns Artist 1 with params as not array', function (done) {
      db.myschema.artists.where("id=$1", 1,function(err,res){
        assert.ifError(err);
        assert.equal(res.length, 1);
        done();
      });
    });
  });
  describe('Simple queries with count', function () {
    it('returns 2 for OR id 1 or 2', function (done) {
      db.myschema.artists.count("id=$1 OR id=$2", [1,2],function(err,res){
        assert.ifError(err);
        assert.equal(res,2);
        done();
      });
    });
    it('returns 1 for id 1', function (done) {
      db.myschema.artists.count("id=$1", [1],function(err,res){
        assert.ifError(err);
        assert.equal(res, 1);
        done();
      });
    });
  });
  describe('Simple comparative queries', function () {
    it('returns Artist with id greater than 2', function (done) {
      db.myschema.artists.find({"id > " : 2}, function(err,res){
        assert.ifError(err);
        assert.equal(res[0].id, 3);
        done();
      });
    });
    it('returns Artist with id less than 2', function (done) {
      db.myschema.artists.find({"id < " : 2}, function(err,res){
        assert.ifError(err);
        assert.equal(res[0].id, 1);
        done();
      });
    });
    it('returns myschema.artists IN 1 and 2', function (done) {
      db.myschema.artists.find({id : [1,2]}, function(err,res){
        assert.ifError(err);
        assert.equal(res[0].id, 1);
        done();
      });
    });
    it('returns Artist NOT IN 1 and 2', function (done) {
      db.myschema.artists.find({"id <>" : [1,2]}, function(err,res){
        assert.ifError(err);
        assert.equal(res[0].id, 3);
        done();
      });
    });
  });
  describe('Limiting and Offsetting results', function () {
    it('returns 1 result with limit of 1', function (done) {
      db.myschema.artists.find(null,{limit : 1}, function(err,res){
        assert.ifError(err);
        assert.equal(res.length, 1);
        done();
      });
    });
    it('returns second result with limit of 1, offset of 1', function (done) {
      db.myschema.artists.find({},{limit : 1, offset: 1}, function(err,res){
        assert.ifError(err);
        assert.equal(res[0].id, 2);
        done();
      });
    });
    it('returns id and name if sending in columns', function (done) {
      db.myschema.artists.find({},{columns :["id","name"]}, function(err,res){
        assert.ifError(err);
        var keys = _.keys(res[0]);
        assert.equal(keys.length,2);
        done();
      });
    });
  });

  describe('Ordering results', function () {
    it('returns ascending order of myschema.artists by name', function (done) {
      db.myschema.artists.find({}, {order : "name"}, function(err,res){
        assert.ifError(err);
        assert.equal(res.length, 3);
        assert.equal(res[0].id, 1);
        assert.equal(res[2].id, 3);
        done();
      });
    });
    it('returns descending order of myschema.artists', function (done) {
      db.myschema.artists.find({},{order : "id desc"}, function(err,res){
        assert.ifError(err);
        assert.equal(res.length, 3);
        assert.equal(res[0].id, 3);
        assert.equal(res[2].id, 1);
        done();
      });
    });
  });
});
