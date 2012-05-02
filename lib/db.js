//Karl's addition - kept here for fun

var Table = require('./table');
var util = require("util");
var _ = require("underscore")._;

var Db = function(connection) {
  this.client = loadClient(connection);
  this.client.connect(connection);
}

Db.prototype.run = function(sql, params) {
  return this.client.run(sql, params);
};

Db.prototype.createTable = function(table, columns) {
  this.client.createTable(table, columns, this);
};

Db.prototype.dropTable = function(table) {
  this.client.dropTable(table, this);
};

function loadClient(connection) {
  if(connection.indexOf("postgresql://") > -1) { return require('./postgres'); }
}

module.exports.connect = function(connection, callback) {
  var db = new Db(connection);
  var schemaQuery =  db.run(db.client.tableSQL);
  schemaQuery.execute(function(err, tables){
    if(err) callback(err);
    _.each(tables, function(tbl){
      db[tbl.name] = new Table(tbl.name, tbl.pk);
    });
    callback(null,db);
  });
};