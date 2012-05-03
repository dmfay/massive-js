var mysql = require("mysql");
var _ = require("underscore")._;
var util = require("util");
var events = require("events");
var massiveQuery = require("./query");

//default it, cause we're nice

var Client = function(){
  var _credentials = {};

  events.EventEmitter.call(this);
};

util.inherits(Client,events.EventEmitter);

Client.prototype.connect = function(credentials) {
  console.log("MYSQL Connecting...");
  _credentials = credentials;
};

//think I need a better home for this... but for now
//this will do
Client.prototype.run = function(sql,params){
  return new massiveQuery(sql,params);
};

Client.prototype.delimitParameter = function(counter) {
  return "?";
};
//break this apart please...
Client.prototype.execute = function(query, callback) {
  //console.log("Executing " + query.sql);
  if(typeof(query) === "object" && typeof(callback) === "object"){
    //this is an event hook - ignore the callback
    this.execute(query)
  }else {
    var client = mysql.createClient(_credentials);
    //mysql HACK
    query.sql = query.sql.replace(/\$[0-9]/mg, "?").replace("RETURNING *", "");
    console.log(query.sql)
    client.query(query.sql, query.params, callback);
  }
};


var _translateType = function(typeName) {
  var _result = typeName;

  switch(typeName){
    case "pk" :
      _result ="int primary key not null auto_increment";
      break;
    case "money" :
      _result ="decimal(8,2)";
      break;
    case "date" :
      _result = "DATETIME";
      break;
    case "string" :
      _result ="VARCHAR(255)";
      break;
    case "int" :
      _result ="INT";
      break;
  }
  return _result;
}

var _containsPK = function(columns) {
  return _.any(columns.values,"pk");
}

Client.prototype.dropTable = function(tableName) {
  return new massiveQuery("DROP TABLE IF EXISTS " + tableName + ";");
}

Client.prototype.createTable = function(tableName, columns) {

  var _sql ="CREATE TABLE " + tableName + "(";
  var _cols = [];

  //force a PK
  if(!_containsPK(columns)){
    columns.id = "pk";
  }

  for(var c in columns){

    if(c == "timestamps"){
      _cols.push("created_at datetime");
      _cols.push("updated_at timestamp");
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
  return new massiveQuery(_sql);
};


module.exports = new Client();