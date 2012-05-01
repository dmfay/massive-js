massive = require "../lib/massive"
should = require "should"

describe "schema", ->
  describe "create table", ->
    
    it "adds a column with NULL declaration", ->
      sql = massive.createTable "cheese", {bucket:"beef NOT NULL PLEASE"}
      sql.indexOf("bucket beef NOT NULL PLEASE").should.be.greaterThan(0)

    it "adds an ID of serial by default", ->
      sql = massive.createTable "cheese",{title:"string"}
      sql.indexOf("id serial PRIMARY KEY").should.be.greaterThan(0)
   
    it "adds a varchar 255 for string", ->
      sql = massive.createTable "cheese",{title:"string"}
      sql.indexOf("title varchar(255)").should.be.greaterThan(0)
    
    it "adds a varchar 255 for string with null", ->
      sql = massive.createTable "cheese",{title:"string null"}
      sql.indexOf("title varchar(255) null").should.be.greaterThan(0)
  
    it "adds a decimal(8,2) for money", ->
      sql = massive.createTable "cheese",{price:"money"}
      sql.indexOf("price decimal(8,2)").should.be.greaterThan(0)

    it "adds a timestamptz for date", ->
      sql = massive.createTable "cheese",{created:"date"}
      sql.indexOf("created timestamptz").should.be.greaterThan(0)

    it "adds a bool for... bool", ->
      sql = massive.createTable "cheese",{stuff:"bool"}
      sql.indexOf("stuff bool").should.be.greaterThan(0)

    it "adds created and updated for timestamps", ->
      sql = massive.createTable "cheese",{timestamps:true}
      sql.indexOf("created_at timestamptz not null default 'now',updated_at timestamptz not null default 'now'").should.be.greaterThan(0)



