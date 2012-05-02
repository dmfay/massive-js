var _table = require("./table");
var _client = require("./postgres");
var _db = require('./db');

module.exports.table = _table;

module.exports.connect = function(connection, callback) {
  console.log("Massive connection set to " + connection);
  if(connection.indexOf("postgresql://") > -1) {
    _client.connect(connection);
  }else{
    //MySQL? Blech...
  }

  if(callback){
    _db.connect(connection,callback);
  }

};

module.exports.Client = _client;
['run', 'createTable', 'dropTable'].forEach(function(method) {
  module.exports[method] = _client[method];
});