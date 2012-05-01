var pg = require("pg");
var _ = require("underscore")._;
var util = require("util");
//default it, cause we're nice
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
    });

    //make sure we close off the connection
    dbQuery.on('end', function(){
      db.end.bind(db);
      query.emit("end", this);
    });
  });
};

exports.getRecords = function(query, callback){
    
  pg.connect(_connectionString, function(err,client){
    client.query(query.sql, query.params,callback);
  });

};

exports.execute = function(query,callback) {
  pg.connect(_connectionString, function(err,client){
    console.log(query.sql)
    console.log(query.params)
    client.query(query.sql, query.params , callback);
  });

};


var _translateType = function(typeName) { 
  var _result = typeName;
  
  switch(typeName){
    case "pk" :
      _result ="serial PRIMARY KEY";
      break;
    case "money" : 
      _result ="decimal(8,2)";
      break;
    case "date" : 
      _result = "timestamptz";
      break;
    case "string" : 
      _result ="varchar(255)";
      break;
    case "search" : 
      _result ="tsvector";
      break;
    case "int" : 
      _result ="int4";
      break;
  }
  return _result;
}

var _containsPK = function(columns) {
  return _.any(columns.values,"pk");
}

exports.dropTable = function(tableName) { 
  return "DROP TABLE IF EXISTS " + tableName + ";";
}

exports.createTable = function(tableName, columns) {
  
  var _sql ="CREATE TABLE " + tableName + "(";
  var _cols = [];

  //force a PK
  if(!_containsPK(columns)){
    columns.id = "pk";
  }

  for(var c in columns){

    if(c == "timestamps"){
      _cols.push("created_at timestamptz not null default 'now'");
      _cols.push("updated_at timestamptz not null default 'now'");
    }else{
      var colName = c;
      var colParts = columns[c].split(" ");
      var colType = colParts[0];
      var translated = _translateType(colType);
      var extras = _.without(colParts,colType).join(" ");
      var declaration = colName + " " + translated + " " + extras; 
      //console.log(declaration);
      _cols.push(declaration);

    }

  }

  _sql+= _cols.join(",") + ");";
  //console.log(_sql);
  return _sql;
}

