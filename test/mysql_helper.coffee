Path = require('path')

class Helper
  @connectionString: ->
    {user : "root", password : "", database : "test"}

  @setup: ->
    massive = require("../index")
    massive.connect @connectionString(), (err, db) ->
      db.createTable('products', {name: 'string'}).execute -> process.exit()

module.exports = Helper


if Path.basename(process.argv[1]) == 'mysql_helper.coffee' && process.argv[2] == 'setup'
  Helper.setup()