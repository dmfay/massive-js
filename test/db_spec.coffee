massive = require("../lib/");
should = require("should");
util = require("util");

# db = null
# before (done) ->
#   massive.connect "postgres://postgres@localhost/test", (err,_db) ->
#     db = _db
#     done()

#   it "calls back with a db", ->
#     should.exist(db)

#   it "has a single table named products", ->
#     should.exist(db.products)

#   it "has a createTable method", ->
#     should.exist(db.createTable)

#   it "has a dropTable method", ->
#     should.exist(db.createTable)