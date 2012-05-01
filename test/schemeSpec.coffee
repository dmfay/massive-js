massive = require "../lib/massive"
should = require "should"

describe "schema", ->
  describe "create table", ->
    
    it "adds a column with NULL declaration", ->
      query = massive.createTable "cheese", {bucket:"beef NOT NULL PLEASE"}
      query.sql.indexOf("bucket beef NOT NULL PLEASE").should.be.greaterThan(0)

    it "adds an ID of serial by default", ->
      query = massive.createTable "cheese",{title:"string"}
      query.sql.indexOf("id serial PRIMARY KEY").should.be.greaterThan(0)
   
    it "adds a varchar 255 for string", ->
      query = massive.createTable "cheese",{title:"string"}
      query.sql.indexOf("title varchar(255)").should.be.greaterThan(0)
    
    it "adds a varchar 255 for string with null", ->
      query = massive.createTable "cheese",{title:"string null"}
      query.sql.indexOf("title varchar(255) null").should.be.greaterThan(0)
  
    it "adds a decimal(8,2) for money", ->
      query = massive.createTable "cheese",{price:"money"}
      query.sql.indexOf("price decimal(8,2)").should.be.greaterThan(0)

    it "adds a timestamptz for date", ->
      query = massive.createTable "cheese",{created:"date"}
      query.sql.indexOf("created timestamptz").should.be.greaterThan(0)

    it "adds a bool for... bool", ->
      query = massive.createTable "cheese",{stuff:"bool"}
      query.sql.indexOf("stuff bool").should.be.greaterThan(0)

    it "adds created and updated for timestamps", ->
      query = massive.createTable "cheese",{timestamps:true}
      query.sql.indexOf("created_at timestamptz not null default 'now',updated_at timestamptz not null default 'now'").should.be.greaterThan(0)



