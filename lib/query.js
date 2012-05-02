var events =require("events");
var util = require("util");
var massive = require("./index");
var _ = require("underscore")._;

var Query = function(_sql,_params){

  events.EventEmitter.call(this);

  this.params = _params || [];
  this.sql = _sql;

  this.on("newListener", function(eventName){
    if(eventName === "row"){
      //fire the query
      massive.Client.execute(this);
    }
  });

  this._error = function(message) {
    console.log('aaa')
    this.error = message;
    return this;
  }

  this.execute = function(callback) {
    if (this.error) { callback(this.error); return; }
    massive.Client.execute(this,callback);
  };
  this.isSelect = function() {
    return this.sql.indexOf("SELECT") > -1;
  }
  this.limit = function (){
    var _limit = "";
    if(arguments.length > 1) _limit = " \nLIMIT (" + arguments[0] + "," + arguments[1] + ")";
    else if(arguments.length > 0) _limit = " \nLIMIT " + arguments[0];

    this.sql+=_limit;
    return this;
  }

  this.columns = function(columns) {
    if (arguments.length > 1) { columns = _.toArray(arguments); }
    if (_.isArray(columns)) { columns = columns.join(', '); }
    this.sql = this.sql.replace("SELECT *", "SELECT " + columns);
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
        n = this.params.length + 1;
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
              this.params.push(conditions[k][i]);
            }
            _conditions.push("\"" + prop + "\"" + ((op == "!=" || op == "<>") ? " NOT" : "") + " IN (" + array_conditions.join(", ") + ")");
            console.log("Expace " + this.params)
          } else {
            _conditions.push("\"" + prop + "\"" + op + "$" + (n++));
            this.params.push(conditions[k]);
          }
      }
    }

    this.sql+= " \nWHERE " + _conditions.join(" \nAND ");
    return this;
  };
}

Query.error = function(message) {
  return new Query(null, null)._error(message);
}

util.inherits(Query,events.EventEmitter);
module.exports = Query;