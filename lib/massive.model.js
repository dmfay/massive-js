var events =require("events");
var util = require("util");
var pg = require("pg");

var Query = function(_sql, _params){
  
  events.EventEmitter.call(this);

  this.params = _params || [];
  this.sql =_sql;
  this.connectionString = "tcp://postgres@localhost/test";

  this.on("newListener", function(eventName){
    //console.log(eventName);
    var _that = this;
    if(eventName == "row"){
      //fire the query
      pg.connect(this.connectionString, function(err,client){
        var query = client.query(_that.sql);
        query.on("row", function(row){
          _that.emit("row",row);
        })
      });
    }
  })
  this.execute = function(callback) {
    var _that = this;
    pg.connect(this.connectionString, function(err,client){
      var query = client.query(_that.sql, _that.params , callback);
    });
  };

  this.toArray = function(callback) {
    var _that = this;
    pg.connect(this.connectionString, function(err,client){
      var query = client.query(_that.sql, _that.params, function(err,results){
        if(err) throw err;
        callback(null,results.rows);
      });
    });
  }

  this.limit = function (){
    var _limit = "";
    if(arguments.length > 1) _limit = " \nLIMIT (" + arguments[0] + "," + arguments[1] + ")";
    else if(arguments.length > 0) _limit = " \nLIMIT " + arguments[0];

    this.sql+=_limit;
    return this;
  }

  this.order = function(order){
    this.sql+= " \nORDER BY " + order;
    return this;
  }

  this.where = function () {
    var conditions = arguments[0];
    var _conditions = [], 
        prop, 
        op,
        _escapes = [], 
        n = _escapes.length + 1;
    var k;
    var limit = "";
    var order = "";
    
    for (k in conditions) {
      if (!conditions.hasOwnProperty(k)) continue;

      if (k.indexOf(" ") > 0) {
        op = k.substr(k.indexOf(" ") + 1, k.length).replace(/^\s+/, "").trim();
        prop = k.substr(0, k.indexOf(" "));

        if ([ "=", "!", ">", "<", ">=", "<=", "!=", "<>" ].indexOf(op) == -1) {
          op = "=";
        }else if([ "!=", "<>"].indexOf(op) > -1) {
          op = "<>";
        } else if (op == "!") {
          op = "!=";
        }

      } else {
        prop = k;
        op = "=";
      }

      switch (typeof conditions[k]) {
        case "boolean":
          _conditions.push("\"" + prop + "\"" + op + (conditions[k] ? 1 : 0));
          break;
        case "number":
          _conditions.push("\"" + prop + "\"" + op + conditions[k]);
          break;
        default:
          if (Array.isArray(conditions[k])) {
            var array_conditions = [];

            for (var i = 0; i < conditions[k].length; i++) {
              array_conditions.push("$" + (n++));
              _escapes.push(conditions[k][i]);
            }
            _conditions.push("\"" + prop + "\"" + ((op == "!=" || op == "<>") ? " NOT" : "") + " IN (" + array_conditions.join(", ") + ")");
          } else {
            _conditions.push("\"" + prop + "\"" + op + "$" + (n++));
            _escapes.push(conditions[k]);
          }
      } 
    }

    this.sql+= " \nWHERE " + _conditions.join(" \nAND ");
    this.params = _escapes;
    return this;
  };
}

util.inherits(Query,events.EventEmitter);

var Massive = function(_tableName,options){

  options || (options = {});
  
  this.tableName = _tableName;
  
  this.primaryKey = options["primaryKeyField"] || "id";
  this.connectionString = options["connection"] || "postgresql://postgres@localhost/test";

  this.client = require("pg");

  this.options = {};
  
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
    var query = new Query("SELECT " + _columns + " FROM " + this.tableName);
    if(this.whereSpecified) query.where(arguments[0]);
    return query;
  };

  this.inline= function(sql, params) {
    return new Query(sql,params);
  }

  this.delete = function() {
    this.parseArgs(arguments);
    var query = new Query("DELETE FROM " + this.tableName);
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
    return new Query(_sql,_args);

  };

  this.update = function(){
    if(arguments.length < 2 ) throw "Have to pass in the update criteria and a key";

    var item = arguments[0];
    var key = arguments[1];

    var _sql ="UPDATE " + _tableName+ " SET ";
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
    var query = new Query(_sql,_args);
    if(typeof(key) === "number"){
      _criteria[this.primaryKey] = key;
      return query.where(_criteria);
    }else{
      return query.where(key);
    }
    
    
    
  }

};

exports.Model = Massive;

