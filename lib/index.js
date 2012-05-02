var _table = require("./table");
var _client = require("./postgres");

module.exports.table = _table;

module.exports.connect = function(connection) {
  console.log("Massive connection set to " + connection);
  if(connection.indexOf("postgresql://") > -1) {
    _client.connect(connection);
  }else{
    //MySQL? Blech...
  }
};

module.exports.Client = _client;
['run', 'createTable', 'dropTable'].forEach(function(method) {
  module.exports[method] = _client[method];
});