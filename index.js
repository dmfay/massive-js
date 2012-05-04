var pg = require("./lib/postgres");
var mysql = require("./lib/mysql");
var _ = require("underscore")._;

var isPostgres = function(connection){
  return !_.isObject(connection) && connection.indexOf("postgres://") > -1;
};

var isMySQL = function(connection){
  return (_.isObject(connection));
}


module.exports.connect = function(connection, callback) {
  //console.log("Massive connection set to " + connection);
  var db;
  if(isPostgres(connection)){
    db = new pg(connection);
  }else if (isMySQL(connection)) {
    db = new mysql(connection);
  }
  
  db.loadTables(callback);
  //_client.connect(connection);
};

// module.exports.Client = _client;

// ['run', 'createTable', 'dropTable'].forEach(function(method) {
//   module.exports[method] = _client[method];
// });

//here's what I want to do: run "connect" and create a new instance of some type of query
//that query will be based on the Client