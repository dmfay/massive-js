massive = require("../index");
should = require("should");
util = require("util");

describe "Postgres Queries", ->
  db = null
  before (done) ->
    massive.connect "postgres://postgres@localhost/test", (err,_db) ->
      db = _db
      done()

  describe "initialization", ->

    it "sets the table name", -> 
      db.products.name.should.equal("products")

    it "defaults the pk to id",  ->
      db.products.pk.should.equal("id")

  describe "Inline SQL", ->
    it "runs a simple query", ->
      db.execute "SELECT * FROM products", (err,result) ->
        should.exist result.rows

  describe "SELECT queries", ->
    it "runs a select *", ->
      query = db.products.find()
      query.sql.should.equal "SELECT * FROM products"
      query.params.length.should.equal 0

    it "adds columns when specified",  ->
      query = db.products.find ["name"]
      query.sql.should.equal "SELECT name FROM products"
      query.params.length.should.equal 0

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
      query = db.products.find(5).limit(1);
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" = 5 \nLIMIT 1")

    it "adds a LIMIT with SKIP if specified", ->
      query = db.products.find(5).limit(10,1);
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" = 5 \nLIMIT(10,1)")

    it "adds an ORDER if specified", ->
      query = db.products.find(5).order("name")
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" = 5 \nORDER BY name")

    it "handles greater than", ->
      query = db.products.find({"id >" : "steve"})
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" > $1")
      query.params.length.should.equal 1

    it "handles less than", ->
      query = db.products.find({"id <" : "steve"})
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" < $1")
      query.params.length.should.equal 1

    it "handles bang equal", ->
      query = db.products.find({"id !=" : "steve"})
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" <> $1")
      query.params.length.should.equal 1

    it "handles ineqaulity", ->
      query = db.products.find({"id <>" : "steve"})
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" <> $1")
      query.params.length.should.equal 1

    it "handles IN", ->
      query = db.products.find({id : ["steve","juice","pete"]})
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" IN ($1, $2, $3)")
      query.params.length.should.equal 3

    it "handles NOT IN", ->
      query = db.products.find({"id != ": ["steve","juice","pete"]})
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" NOT IN ($1, $2, $3)")
      query.params.length.should.equal 3

    it "handles inline goodness", ->
      query = db.run("select * from crazytown where id = $1", [1]);
      query.sql.should.equal("select * from crazytown where id = $1")
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
      query.sql.should.equal "INSERT INTO products (name, price) VALUES\n($1, $2) \nRETURN *"
      query.params.length.should.equal 2

    it "creates a batch for item arrays", ->
      items = [{title:"stuffy stuff", price: 12.00, desc : "bubble"},{title:"poofy poof", price: 24.00, desc : "glurp"}];
      query = db.products.insert(items)
      query.sql.should.equal "INSERT INTO products (title, price, desc) VALUES\n($1, $2, $3),\n($4, $5, $6) \nRETURN *"
      query.params.length.should.equal 6

    it "throws an error if no data was supplied", ->
      (-> db.products.insert().execute()).should.throw

  describe "updates", ->
    it "creates a basic update", ->
      query = db.products.update({name:"pumpkin", price:1000}, 12)
      query.sql.should.equal("UPDATE products SET name = $1, price = $2 \nWHERE \"id\" = 12")
      query.params.length.should.equal 2
    
    it "creates a basic update with a string key", ->
      query = db.products.update({name:"pumpkin", price:1000}, "12")
      query.sql.should.equal("UPDATE products SET name = $1, price = $2 \nWHERE \"id\" = $3")
      query.params.length.should.equal 3

    it "creates a basic update with multi result", ->
      query = db.products.update({name:"pumpkin", price:1000}, {"id >": 12})
      query.sql.should.equal("UPDATE products SET name = $1, price = $2 \nWHERE \"id\" > 12")
      query.params.length.should.equal 2

    it "updates all rows", ->
      query = db.products.update({name:"leto", sand: true})
      query.sql.should.equal("UPDATE products SET name = $1, sand = $2")
      query.params.length.should.equal 2


  describe "aggregates", ->
    it "counts with SELECT COUNT", ->
      query = db.products.count()
      query.sql.should.equal("SELECT COUNT(1) FROM products");
    it "counts with SELECT COUNT and a WHERE", ->
      query = db.products.count({"id > " : 1})
      query.sql.should.equal("SELECT COUNT(1) FROM products \nWHERE \"id\" > 1");

  describe "events", ->

    it "fires iterator when new events are added", ->
      query = db.products.find ->
      query.on "row", (row)->
        console.log(row)
        should.exist(row)

  describe "iterators on tables and queries", ->
    it "has an each method", ->
      query = db.products.find()
      should.exist query.each
    
    it "should iterate", ->
      query = db.products.find()
      query.each (err,result) ->
        should.exist result

    it "tables should have an each method", ->
      should.exist db.products.each

    #this is a stupid test
    it "iterates on the table", ->
      count = 0
      db.products.each (err,result) ->
        count++
        count.should.be.greaterThan 0

  describe "singles on queries and tables", ->
    it "query has a first method", ->
      query = db.products.find()
      should.exist query.first

    it "query returns a single item", (done)->
      query = db.products.find()
      query.first (err,result) ->
        should.exist result
        done()

    it "table has a first method", ->
      should.exist db.products.first

    it "returns the first item in table", ->
      db.products.first (err,result) ->
        should.exist(result)

    it "has a last method", ->
      query = db.products.find()
      should.exist query.last

    it "returns a single item", (done)->
      query = db.products.find()
      query.last (err,result) ->
        should.exist result
        done()     

    it "table has a first method", ->
      should.exist db.products.last

    it "returns the first item in table", ->
      db.products.last (err,result) ->
        should.exist(result)
