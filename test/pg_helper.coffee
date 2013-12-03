Path = require('path')

class Helper
  @connectionString: ->
    process.env.MASSIVE_PG_TEST || "postgres://postgres@localhost/test"

  @setup: ->
    massive = require("../index")
    massive.connect @connectionString(), (err, db) ->
      db.createTable('products', {name: 'string'}).execute () -> db.end()

module.exports = Helper


if Path.basename(process.argv[1]) == 'pg_helper.coffee' && process.argv[2] == 'setup'
  Helper.setup()
