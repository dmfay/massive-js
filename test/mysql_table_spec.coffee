massive = require("../index")
should = require("should")
util = require("util")
helper = require('./mysql_helper')

describe "MySql Tables", ->
  db = null
  before (done) ->
    massive.connect helper.connectionString(), (err,_db) ->
      db = _db
      done()

  describe "initialization", ->

    it "contains a reference to the mysql db", ->
      should.exist db

    #this requires a products table in the test db
    it "grafts the tables onto the query", ->
      should.exist(db.products)

  describe "Table data access", ->
    it "returns the pk", ->
      db.products.pk.should.equal "id"

    it "sets the table name", ->
      db.products.name.should.equal "products"

    it "returns the last record in the table", ->
      query = db.products.last()
      query.sql.should.equal "SELECT * FROM products ORDER BY id DESC LIMIT 1 "
      query.params.length.should.equal 0

    it "returns the first record in the table", ->
      query = db.products.first()
      query.sql.should.equal "SELECT * FROM products ORDER BY id LIMIT 1 "
      query.params.length.should.equal 0

    it "returns all table records using find() with no params", ->
      query = db.products.find()
      query.sql.should.equal "SELECT * FROM products"
      query.params.length.should.equal 0

    it "returns all table records with id meeting criteria using find() with params", ->
      query = db.products.find({"id >" : "steve"})
      query.sql.should.equal "SELECT * FROM products \nWHERE \"id\" > ?"
      query.params.length.should.equal 1

    it "returns all table records meeting arbitrary column criteria using find() with params", ->
      query = db.products.find({"name =" : "John"})
      query.sql.should.equal "SELECT * FROM products \nWHERE \"name\" = ?"
      query.params.length.should.equal 1
 
  describe "Table Iterators", ->
    it "tables should have an each method", ->
      should.exist db.products.each
    
    it "should iterate", ->
      query = db.products.find()
      query.each (err,result) ->
        should.exist result

  describe "insert", ->
    it "creates a basic insert with returning", ->
      query = db.products.insert({name : "steve", price : 12.00})
      query.sql.should.equal "INSERT INTO products (name, price) VALUES\n(?, ?)"
      query.params.length.should.equal 2

    it "creates a batch for item arrays", ->
      items = [{title:"stuffy stuff", price: 12.00, desc : "bubble"},{title:"poofy poof", price: 24.00, desc : "glurp"}]
      query = db.products.insert(items)
      query.sql.should.equal "INSERT INTO products (title, price, desc) VALUES\n(?, ?, ?),\n(?, ?, ?)"
      query.params.length.should.equal 6

    it "throws an error if no data was supplied", ->
      (-> db.products.insert().execute()).should.throw

  describe "updates", ->
    it "creates a basic update", ->
      query = db.products.update({name:"pumpkin", price:1000}, 12)
      query.sql.should.equal("UPDATE products SET name = ?, price = ? \nWHERE \"id\" = 12")
      query.params.length.should.equal 2

    it "creates a basic update with a string key", ->
      query = db.products.update({name:"pumpkin", price:1000}, "12")
      query.sql.should.equal("UPDATE products SET name = ?, price = ? \nWHERE \"id\" = ?")
      query.params.length.should.equal 3

    it "creates a basic update with multi result", ->
      query = db.products.update({name:"pumpkin", price:1000}, {"id >": 12})
      query.sql.should.equal("UPDATE products SET name = ?, price = ? \nWHERE \"id\" > 12")
      query.params.length.should.equal 2

    it "updates all rows", ->
      query = db.products.update({name:"leto", sand: true})
      query.sql.should.equal "UPDATE products SET name = ?, sand = ?"
      query.params.length.should.equal 2

  describe "destroy", ->
    it "creates a delete everything", ->
      query = db.products.destroy()
      query.sql.should.equal "DELETE FROM products"
      query.params.length.should.equal 0

    it "uses where when specified as an argument", ->
      query = db.products.destroy({id : 1})
      query.sql.should.equal "DELETE FROM products \nWHERE \"id\" = 1"
      query.params.length.should.equal 0

    it "adds a where as a primary key", ->
      query = db.products.destroy(6)
      query.sql.should.equal "DELETE FROM products \nWHERE \"id\" = 6"
      query.params.length.should.equal 0
