var _query = require('../lib/massive.query');

var Model = function(tableName, pKField) {

  this.tableName = tableName;
  
  this.primaryKey = pKField || "id";
  
  //this.emit("initialized");
  this.parseArgs = function(args){
    var argLength = args.length;
    this.options = args;
    if(argLength > 0){
      this.options = args[0];
      if(this.options.columns) this.columnsSpecified = true;
      else this.whereSpecified = true;
    }
  };
  
  this.select = function(){
    this.parseArgs(arguments);
    var _columns = this.options.columns || "*";
    var query = new _query("SELECT " + _columns + " FROM " + this.tableName);
    if(this.whereSpecified) query.where(arguments[0]);
    return query;
  };

  this.inline= function(sql, params) {
    return new _query(sql,params);
  }

  this.delete = function() {
    this.parseArgs(arguments);
    var query = new _query("DELETE FROM " + this.tableName);
    if(arguments.length > 0) query = query.where(arguments[0]);
    return query;
  }

  this.insert = function(){
    if(arguments.length == 0 ) throw "Have to pass in some kind of value yo..."
    var item = arguments[0];
    var _sql = "INSERT INTO " + this.tableName;
    var _args = [];
    var _counter=1;
    var _cols = [];
    var _vals= [];
    for(var prop in item){
      _cols.push(prop);
      _vals.push("$"+_counter);
      _args.push(item[prop]);
      _counter++;
    };
    _sql = _sql + "("+_cols.join(", ")+") VALUES ("+_vals.join(", ")+")";
    return new _query(_sql,_args);

  };

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

    _args.push(key);
    var query = new _query(_sql,_args);
    if(typeof(key) === "number"){
      _criteria[this.primaryKey] = key;
      return query.where(_criteria);
    }else{
      return query.where(key);
    }
    
    
    
  }

};

module.exports = Model;
