var _query = require('./query');
var _ = require("underscore")._;
var util = require("util");

var Table = function(tableName, primaryKey) {
  this.tableName = tableName;
  this.primaryKey = primaryKey || "id";

  this.count = function(where) {
    var query = new _query("SELECT COUNT(1) FROM " + this.tableName);
    return where ? query.where(where) : query;
  };

  this.all = function(where){
    var query = new _query("SELECT * FROM " + this.tableName);
    return where ? query.where(where) : query;
  };

  this.destroy = function(where) {
    var query = new _query("DELETE FROM " + this.tableName);
    return where ? query.where(where) : query;
  }

  this.insert = function(data) {
    if(!data) { return _query.error("insert should be called with data"); }
    if (!_.isArray(data)) { data = [data]; }

    var sql = util.format("INSERT INTO %s (%s) VALUES\n", this.tableName, _.keys(data[0]).join(", "));
    var parameters = [];
    var values = []
    for(var i = 0, seed = 0; i < data.length; ++i) {
      var v = _.map(data[i], function() { return '$' + ++seed;});
      values.push(util.format('(%s)', v.join(', ')));
      parameters.push(_.values(data[i]));
    }
    sql += values.join(",\n");
    return new _query(sql, _.flatten(parameters));
  };


  this.update = function(){
    if(arguments.length < 2 ) { return _query.error("Have to pass in the update criteria and a key"); }

    var item = arguments[0];
    var key = arguments[1];

    var _sql ="UPDATE " + this.tableName+ " SET ";
    var _args = []
    var _counter=1;
    var _vals = []
    var _criteria = {};

    for(var prop in item){
      if (!item.hasOwnProperty(prop)) continue;
      _vals.push(prop+"=$"+_counter);
      _args.push(item[prop]);
      _counter++;
    }
    _sql += _vals.join(", ");


    var updateQuery = new _query(_sql,_args);
    if(typeof(key) === "number"){
      _criteria[this.primaryKey] = key;
      updateQuery.where(_criteria);
    }else{
      updateQuery.where(key);
    }
    return updateQuery;
  };

};

module.exports = Table;