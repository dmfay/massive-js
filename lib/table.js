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

  this.select = function(where){
    var query = new _query("SELECT * FROM " + this.tableName);
    return where ? query.where(where) : query;
  };

  this.destroy = function(where) {
    var query = new _query("DELETE FROM " + this.tableName);
    return where ? query.where(where) : query;
  }

  this.insert = function(data){
    if(!data) throw "Have to pass in some kind of value yo..."
    var parsed = _parseInserts(data, 1);
    var _sql = util.format("INSERT INTO %s (%s) VALUES (%s) RETURNING *", this.tableName, parsed.cols.join(", "), parsed.values.join(", "));
    return new _query(_sql,parsed.params);
  };

  var _parseInserts = function(item, seed) {
    var _args = [];
    var _cols = [];
    var _vals= [];
    for(var prop in item){
      _cols.push(prop);
      _vals.push("$" + seed++);
      _args.push(item[prop]);
    };
    return {cols : _cols, values : _vals, params : _args, seedStop : seed};
  }
  this.insertBatch = function(){
    //this handles an array
    var _sql = "INSERT INTO " + this.tableName;
    var _columnList;
    var _statements = [];
    var _params = [];
    var _counter = 1;

    for(var i = 0;i < arguments[0].length; i ++){
      var item = arguments[0][i];
      var _parsed = _parseInserts(item, _counter);
      _counter = _parsed.seedStop;
      if(!_columnList){
        _columnList = "("+_parsed.cols.join(", ")+") \n VALUES \n";
      }

      var _valueList = "\n("+_parsed.values.join(", ")+")";
      _statements.push(_valueList);
      _.each(_parsed.params, function(p){
        _params.push(p);
      });
    }
    return new _query(_sql + _columnList + _statements.join(",\n"), _params);
  }

  this.update = function(){
    if(arguments.length < 2 ) throw "Have to pass in the update criteria and a key";

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