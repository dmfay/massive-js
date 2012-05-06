var events =require('events');
var util = require('util');
var _ = require('underscore')._;
var mysql = require("mysql");
var Query = require('./query');
var Table = require('./table');

var MySQL = function(credentials){
  events.EventEmitter.call(this);
  var self = this;
  this.dbType = "MySQL";
  this.tables = [];
  this.credentials = credentials;
  this.sql = "";
  this.params = [];

  this.tableSQL = "SELECT table_name as 'name',     \
    (                                               \
      select column_name from                       \
      information_schema.key_column_usage           \
      where table_name = ist.table_name             \
      and constraint_name = 'PRIMARY'               \
    )  as 'pk'                                      \
    from information_schema.tables ist              \
    where table_schema = '" + credentials.database + "'";


  this.placeholder = function(seed) { return '?'; }

  this.execute = function(sql, params, callback) {

    var client = mysql.createClient(credentials);

    self.emit("beforeExecute", self);
    client.query(sql, params, function(err, results){

      if(err && callback) {
        callback(err,null)
        self.emit("error", err);
      }else {
        if(callback)callback(null,results);
        self.emit("executed");
      }

    });

  };
  this.run = function(sql,params) {
    return new Query(sql,params, this);
  };

  this.loadTables = function(callback) {
    self.execute(self.tableSQL, [], function(err, tables){
      _.each(tables, function(table){
        var t = new Table(table.name, table.pk, self);
        self.tables.push(t);
        self[t.name] = t;
      });
      callback(null,self);
    });
  };
var _translateType = function(typeName) {
  var _result = typeName;

  switch(typeName){
    case "pk" :
      _result ="INT NOT NULL PRIMARY KEY AUTO_INCREMENT";
      break;
    case "money" :
      _result ="decimal(8,2)";
      break;
    case "date" :
      _result = "datetime";
      break;
    case "string" :
      _result ="varchar(255)";
      break;
  }
  return _result;
}

var _containsPK = function(columns) {
  return _.any(columns.values,"pk");
}

this.dropTable = function(tableName) {
  return new Query("DROP TABLE IF EXISTS " + tableName + ";", [], new Table(tableName, "", self));
}

this.createTable = function(tableName, columns) {

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
  return new Query(_sql, [], new Table(tableName, columns.id, self));
};


};
util.inherits(MySQL,events.EventEmitter);

module.exports = MySQL;