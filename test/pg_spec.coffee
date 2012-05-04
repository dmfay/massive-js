massive = require("../index");
should = require("should");
util = require("util");

describe "Connections", ->
  db = null
  before (done) ->
    massive.connect "postgres://postgres@localhost/test", (err,_db) ->
      db = _db
      #console.log(db)
      done()

  it "returns a new postgres db", ->
    should.exist db

  it "has a tables array", ->
    should.exist db.tables

  it "sets the connectionString", ->
    should.exist db.connectionString

  it "sets dbType to PostgreSQL", ->
    db.dbType.should.equal("PostgreSQL")

  it "loads tables with name and pk", ->
    db.tables.length.should.be.greaterThan 0

  #this requires a products table in the test db
  it "grafts the tables onto the query", ->
    should.exist db.products

  it "returns the pk", ->
    db.products.pk.should.equal("id")
