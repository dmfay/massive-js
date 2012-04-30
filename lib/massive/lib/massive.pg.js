var pg = require("pg");

var _connectionString = "tcp://postgres@localhost/postgres";

module.exports.connect = function(connection) {
  console.log("Setting connection to " + connection);
  _connectionString = connection;
};

exports.stream = function(query) { 
  pg.connect(_connectionString, function(err,db){
    var dbQuery = db.query(query.sql);
    dbQuery.on("row", function(row){
      query.emit("row",row);
    })
  });
};

exports.getRecords = function(query, callback){
    
  pg.connect(_connectionString, function(err,client){
    client.query(query.sql, query.params,callback);
  });

};

exports.execute = function(query,callback) {
  var _that = this;
  
  pg.connect(_connectionString, function(err,client){
    var query = client.query(query.sql, query.params , callback);
  });

};

