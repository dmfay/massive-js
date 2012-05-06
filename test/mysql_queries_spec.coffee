massive = require("../index")
should = require("should")
util = require("util")
helper = require('./mysql_helper')

describe "MySQL Queries", ->
  db = null
  before (done) ->
    massive.connect helper.connectionString(), (err,_db) ->
      db = _db
      done()

  describe "initialization", ->

    it "sets the table name", ->
      db.products.name.should.equal("products")

    it "defaults the pk to id",  ->
      db.products.pk.should.equal("id")


  describe "SELECT queries", ->
    it "runs a select *", ->
      query = db.products.find()
      query.sql.should.equal "SELECT * FROM products"
      query.params.length.should.equal 0

    it "adds columns when specified",  ->
      query = db.products.find ["name"]
      query.sql.should.equal "SELECT name FROM products"


    it "adds columns when specified in criteria",  ->
      query = db.products.find {}, {columns : "name"}
      query.sql.should.equal "SELECT name FROM products"
      query.params.length.should.equal 0

    it "adds a where when id is a number", ->
      query = db.products.find {id : 1}
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" = 1")
      query.params.length.should.equal 0

    it "adds a where as a primary key", ->
      query = db.products.find(5)
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" = 5")
      query.params.length.should.equal 0


    it "adds a LIMIT if specified", ->
      query = db.products.find(5).limit(1)
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" = 5 \nLIMIT 1")

    it "adds a LIMIT with SKIP if specified", ->
      query = db.products.find(5).limit(10,1)
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" = 5 \nLIMIT(10,1)")

    it "adds an ORDER if specified", ->
      query = db.products.find(5).order("name")
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" = 5 \nORDER BY name")

    it "handles greater than", ->
      query = db.products.find({"id >" : "steve"})
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" > ?")
      query.params.length.should.equal 1

    it "handles less than", ->
      query = db.products.find({"id <" : "steve"})
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" < ?")
      query.params.length.should.equal 1

    it "handles bang equal", ->
      query = db.products.find({"id !=" : "steve"})
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" <> ?")
      query.params.length.should.equal 1

    it "handles ineqaulity", ->
      query = db.products.find({"id <>" : "steve"})
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" <> ?")
      query.params.length.should.equal 1

    it "handles IN", ->
      query = db.products.find({id : ["steve","juice","pete"]})
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" IN (?, ?, ?)")
      query.params.length.should.equal 3

    it "handles NOT IN", ->
      query = db.products.find({"id != ": ["steve","juice","pete"]})
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" NOT IN (?, ?, ?)")
      query.params.length.should.equal 3

    it "handles inline goodness", ->
      query = db.run("select * from crazytown where id = ?", [1])
      query.sql.should.equal("select * from crazytown where id = ?")
      query.params.length.should.equal 1

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
      query.sql.should.equal("DELETE FROM products \nWHERE \"id\" = 6")
      query.params.length.should.equal 0

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
      query.sql.should.equal("UPDATE products SET name = ?, sand = ?")
      query.params.length.should.equal 2


  describe "aggregates", ->
    it "counts with SELECT COUNT", ->
      query = db.products.count()
      query.sql.should.equal("SELECT COUNT(1) FROM products")
    it "counts with SELECT COUNT and a WHERE", ->
      query = db.products.count({"id > " : 1})
      query.sql.should.equal("SELECT COUNT(1) FROM products \nWHERE \"id\" > 1")

