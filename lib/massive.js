var _model = require("../lib/massive.model");

Massive = function(){
  this.connectionString = "";
};

Massive.prototype.Model = function(tableName, pk) {
  var model = new _model(tableName, pk);
  return model;
};

Massive.prototype.connect = function(connectionString){
  this.connectionString = connectionString;
};

module.exports = new Massive();

