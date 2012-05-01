var _model = require("./massive.model");
var _client = require("./massive.pg");


module.exports.Model = _model;
//an alias
module.exports.table = _model;

module.exports.connect = function(connection) {
  console.log("Setting connection to " + connection);
  
  if(connection.indexOf("postgresql://") > -1) {
    _client.connect(connection);
  }else{
    //MySQL? Blech...
  }
};


module.exports.createTable = _client.createTable;

module.exports.dropTable = _client.dropTable;

module.exports.Client = _client;

