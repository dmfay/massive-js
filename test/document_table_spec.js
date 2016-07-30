var assert = require("assert");
var _ = require('underscore')._;
var helpers = require("./helpers");
var db;
var schema = 'spec';
var tableName = 'doggies';
var schemaTableName = schema + '.' + tableName;

describe('Document table', function () {

  before(function(done){
    helpers.resetDb(function(err,res){
      db = res;
      done();
    });
  });

  describe('create', function() {

    describe('without schema', function() {

      after(function(done) {
        db.dropTable(tableName, {cascade: true}, done);
      });

      it('creates a table on public schema', function(done) {
        db.createDocumentTable(tableName, function(err, res) {
          assert.ifError(err);
          assert(_.isEqual([], res), 'should be empty array');
          done();
        });
      });

    });

    describe('with schema', function() {

      before(function(done) {
        db.createSchema(schema, done);
      });

      after(function(done) {
        db.dropTable(schemaTableName, {cascade: true}, done);
      });

      it('creates a table on the specified schema', function(done) {
        db.createDocumentTable(schemaTableName, function(err, res) {
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
        db.createDocumentTable(tableName, done);
      });

      it('removes the table from public schema', function(done) {
        db.dropTable(tableName, {cascade: true}, function(err, res) {
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
          db.createDocumentTable(schemaTableName, done);
        });
      });

      it('removes the table from the specified schema', function(done) {
        db.dropTable(schemaTableName, {cascade: true}, function(err, res) {
          assert.ifError(err);
          assert(_.isEqual([], res), 'should be empty array');
          assert.equal(undefined, db[schema][tableName]);
          done();
        });
      });
    });

  });

});
