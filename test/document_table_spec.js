var assert = require("assert");
var _ = require('underscore')._;
var helpers = require("./helpers");
var db;
var schema = 'spec';
var tableName = 'doggies';
var schemaTableName = schema + '.' + tableName;

describe('Document table', function () {

  beforeEach(function(done){
    helpers.resetDb(function(err,res){
      db = res;
      done();
    });
  });

  afterEach(function(done) {
    db.dropSchema(schema, {cascade: true}, function(err) {
      assert.ifError(err);
      db.dropDocumentTable(tableName, {cascade: true}, function(err) {
        assert.ifError(err);
        done();
      });
    });
  });

  describe('create', function() {

    describe('without schema', function() {

      it('creates a table on public schema', function(done) {
        db.createTable(tableName, function(err, res) {
          assert.ifError(err);
          assert(_.isEqual([], res), 'should be empty array');
          done();
        });
      });

    });

    describe('with schema', function() {

      before(function(done) {
        db.createSchema(schema, function(err) {
          assert.ifError(err);
          done();
        });
      });

      it('creates a table on the specified schema', function(done) {
        db.createTable(schemaTableName, function(err, res) {
          assert.ifError(err);
          assert(_.isEqual([], res), 'should be empty array');
          done();
        });
      });

    });

  });


  describe('drop', function() {

    describe('without schema', function() {

      before(function(done) {
        db.createTable(tableName, function(err) {
          assert.ifError(err);
          done();
        });
      });

      it('removes the table from public schema', function(done) {
        db.dropDocumentTable(tableName, {cascade: true}, function(err, res) {
          assert.ifError(err);
          assert(_.isEqual([], res), 'should be empty array');
          assert.equal(undefined, db[tableName]);
          done();
        });
      });

    });

    describe('with schema', function() {

      before(function(done) {
        db.createSchema(schema, function(err) {
          assert.ifError(err);
          db.createTable(schemaTableName, function(err) {
            assert.ifError(err);
            done();
          });
        });
      });

      it('removes the table from the specified schema', function(done) {
        db.dropDocumentTable(schemaTableName, {cascade: true}, function(err, res) {
          assert.ifError(err);
          assert(_.isEqual([], res), 'should be empty array');
          assert.equal(undefined, db[schema][tableName]);
          done();
        });
      });
    });

  });

});
