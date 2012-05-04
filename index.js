var pg = require("./lib/postgres_db");


module.exports.connect = function(connection, callback) {
  //console.log("Massive connection set to " + connection);
  var db;
  try{
	  if(connection.indexOf("postgres://") > -1){
	  	db = new pg(connection);
	  }  	
	}catch(err){
		callback(err,null);
		return;
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