massive = require("../lib/massive.model");

describe "initialization", ->
  m={}
  before ->
    m = new massive.Model("products")
    
  it "sets the table name", ->
    m.tableName.should.equal("products")

  it "defaults the pk to id",  ->
    m.primaryKey.should.equal("id")  

describe "queries", ->
  m = {}
  beforeEach (done) ->
    m = new massive.Model("products")
    done()

  describe "select", ->
    it "runs a select star", ->
      query = m.select()
      query.sql.should.equal("SELECT * FROM products")

    it "adds columns when specified",  ->
      query =m.select {columns:"name,price"}
      query.sql.should.equal("SELECT name,price FROM products")
 
    it "adds a where when specified as an argument", ->
      query = m.select({name : "steve"})
      query.sql.should.equal("SELECT * FROM products \nWHERE \"name\"=$1")

    it "adds a where when specified as a method", ->
      query = m.select().where({name : "steve"})
      query.sql.should.equal("SELECT * FROM products \nWHERE \"name\"=$1")
    
    it "tracks params when where specified", ->
      query = m.select().where({name : "steve"})
      query.params.length.should.equal 1

    it "adds a LIMIT if specified", ->
      query = m.select().where({name : "steve"}).limit(1);
      query.sql.should.equal("SELECT * FROM products \nWHERE \"name\"=$1 \nLIMIT 1")

    it "adds an ORDER if specified", ->
      query = m.select().where({name : "steve"}).order("name").limit(1);
      query.sql.should.equal("SELECT * FROM products \nWHERE \"name\"=$1 \nORDER BY name \nLIMIT 1")
  

    it "handles greater than", ->
      query = m.select().where({"id >" : "steve"})
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\">$1")
    it "handles less than", ->
      query = m.select({"id <" : "steve"})
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\"<$1")      
    
    it "handles bang equal", ->
      query = m.select({"id !=" : "steve"})
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\"<>$1")   
    
    it "handles ineqaulity", ->
      query = m.select({"id <>" : "steve"})
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\"<>$1") 
    
    it "handles IN", ->
      query = m.select({id : ["steve","juice","pete"]})
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" IN ($1, $2, $3)") 
    
    it "handles NOT IN", ->
      query = m.select({"id != ": ["steve","juice","pete"]})
      query.sql.should.equal("SELECT * FROM products \nWHERE \"id\" NOT IN ($1, $2, $3)") 

    it "handles inline goodness", ->
      query = m.inline("select * from crazytown where id = $1", [1]);
      query.sql.should.equal("select * from crazytown where id = $1") 
      query.params.length.should.equal(1)

  describe "delete", ->
    it "creates a delete everything", ->
      query = m.delete()
      query.sql.should.equal "DELETE FROM products"

    it "uses where when specified as an argument", ->
      query = m.delete({id : 1})
      query.sql.should.equal "DELETE FROM products \nWHERE \"id\"=1"

    it "uses where when specified as a method", ->
      query = m.delete().where({id : 1});
      query.sql.should.equal "DELETE FROM products \nWHERE \"id\"=1"


  describe "insert", ->
    it "creates a basic insert", ->
      query = m.insert({name : "steve", price : 12.00})
      query.sql.should.equal "INSERT INTO products(name, price) VALUES ($1, $2)"


  describe "updates", ->
    it "creates a basic update", ->
      query = m.update({name:"pumpkin", price:1000}, 12)
      query.sql.should.equal("UPDATE products SET name=$1, price=$2 \nWHERE \"id\"=12")

    it "creates a basic update with multi result", ->
      query = m.update({name:"pumpkin", price:1000}, {"id >": 12})
      query.sql.should.equal("UPDATE products SET name=$1, price=$2 \nWHERE \"id\">12")

  describe "events", ->
    it "fires something when new events are added", ->
      query = m.select();
      query.on "row", (row)->
        console.log(row.name)
        should.exist(row.name)

  describe "results", ->
    it "runs", (done) ->
      query = m.select();
      query.toArray (err,result) ->
        result.length.should.equal(0)
        done()

 