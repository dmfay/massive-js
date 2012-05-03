var _table = require("./table");
var _client = require("./mysql");

module.exports.table = _table;

module.exports.connect = function(connection) {
  console.log("Massive connection set to " + connection);
  _client.connect(connection);
};

module.exports.Client = _client;

['run', 'createTable', 'dropTable'].forEach(function(method) {
  module.exports[method] = _client[method];
});