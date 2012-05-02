var _model = require("./model");
var _client = require("./postgres");

module.exports.Model = _model;
//an alias
module.exports.table = _model;

module.exports.connect = function(connection) {
  console.log("Massive connection set to " + connection);
  if(connection.indexOf("postgresql://") > -1) {
    _client.connect(connection);
  }else{
    //MySQL? Blech...
  }
};

module.exports.run = _client.run;

module.exports.createTable = _client.createTable;

module.exports.dropTable = _client.dropTable;

module.exports.Client = _client;

