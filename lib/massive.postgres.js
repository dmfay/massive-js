var pg = require("pg");
var massive = require("../lib/massive");
var util = require("util");

var Client = function() {

   //uses the event emitter action
  var _stream = function(query) { 
    massive.connect("lslsls");
    console.log("Massive connection is " + util.inspect(massive.connectionString));
    pg.connect(massive.connectionString, function(err,db){
      var dbQuery = db.query(query.sql);
      dbQuery.on("row", function(row){
        query.emit("row",row);
      })
    });

  };

  var _getRecords = function(query, callback){
    
    pg.connect(_connectionString, function(err,client){
      client.query(query.sql, query.params,callback);
    });

  };

  var _execute = function(query,callback) {
    var _that = this;
    
    pg.connect(_connectionString, function(err,client){
      var query = client.query(query.sql, query.params , callback);
    });

  };

  return {
    getRecords : _getRecords,
    execute : _execute,
    stream : _stream
  }

}();

module.exports = Client;

