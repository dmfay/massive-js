massive = require("../index")
should = require("should")
util = require("util")


describe "schema queries", ->
  db = null
  before (done) ->
     massive.connect {user : "root", password : "", database : "test"}, (err,_db) ->
      db = _db
      done()

  it "should exist", ->
    should.exist db

  describe "dropTable", ->
    it "creates a drop statement", ->
      db.dropTable("cheese").sql.should.equal("DROP TABLE IF EXISTS cheese;")

  describe "create table", ->

    it "adds a column with NULL declaration", ->
      query = db.createTable "cheese", {bucket:"beef NOT NULL PLEASE"}
      query.sql.indexOf("bucket beef NOT NULL PLEASE").should.be.greaterThan(0)

    it "adds primary key by default", ->
      query = db.createTable "cheese",{title:"string"}
      query.sql.indexOf("INT NOT NULL PRIMARY KEY AUTO_INCREMENT").should.be.greaterThan(0)

    it "adds a varchar 255 for string", ->
      query = db.createTable "cheese",{title:"string"}
      query.sql.indexOf("title varchar(255)").should.be.greaterThan(0)

    it "adds a varchar 255 for string with null", ->
      query = db.createTable "cheese",{title:"string null"}
      query.sql.indexOf("title varchar(255) null").should.be.greaterThan(0)

    it "adds a decimal(8,2) for money", ->
      query = db.createTable "cheese",{price:"money"}
      query.sql.indexOf("price decimal(8,2)").should.be.greaterThan(0)

    it "adds a datetime for date", ->
      query = db.createTable "cheese",{created:"date"}
      console.log(query.sql)
      query.sql.indexOf("created datetime").should.be.greaterThan(0)

    it "adds a bool for... bool", ->
      query = db.createTable "cheese",{stuff:"bool"}
      query.sql.indexOf("stuff bool").should.be.greaterThan(0)

    it "adds created and updated for timestamps", ->
      query = db.createTable "cheese",{timestamps:true}
      query.sql.indexOf("created_at datetime,updated_at timestamp").should.be.greaterThan(0)
