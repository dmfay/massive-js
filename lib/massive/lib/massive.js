var _model = require("./massive.model");
var _client = require("./massive.pg");

module.exports.Model = function(tableName, pk) {
    return new _model(tableName,pk);
};

module.exports.connect = function(connection) {
  console.log("Setting connection to " + connection);
  
  if(connection.indexOf("postgresql://") > -1) {
    _client.connect(connection);
  }else{
    //MySQL? Blech...
  }
};

module.exports.Client = _client;

