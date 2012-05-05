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
    var pg = require("./lib/postgres");
    db = new pg(connection);
  }else if (isMySQL(connection)) {
    var mysql = require("./lib/mysql");
    db = new mysql(connection);
  }
  
  db.loadTables(callback);
};
