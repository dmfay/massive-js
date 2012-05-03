var events =require("events");
var util = require("util");
var massive = require("./index");
var _ = require("underscore")._;

var Query = function(_sql,_params){

  var self = this;
  events.EventEmitter.call(self);

  self.params = _params || [];
  self.sql = _sql;

  self.on("newListener", function(eventName){
    console.log("Adding a listener for " + eventName);
    if(eventName === "row"){
      //fire the query
      massive.Client.execute(self);
    }
  });

  this._error = function(message) {
    self.error = message;
    return self;
  }

  this.execute = function(callback) {
    if (self.error) { callback(self.error); return; }
    massive.Client.execute(self,callback);
  };

  this.isSelect = function() {
    return self.sql.indexOf("SELECT") > -1;
  }
  this.limit = function (count, offset){
    var _limit = _.isUndefined(offset) ? util.format(" \nLIMIT %d", count) : util.format(" \nLIMIT(%d, %d)", count, offset);
    self.sql += _limit;
    return self;
  }

  this.columns = function(columns) {
    if (arguments.length > 1) { columns = _.toArray(arguments); }
    if (_.isArray(columns)) { columns = columns.join(', '); }
    self.sql = self.sql.replace("SELECT *", "SELECT " + columns);
    return self;
  }

  this.columns = function(columns) {
    if (arguments.length > 1) { columns = _.toArray(arguments); }
    if (_.isArray(columns)) { columns = columns.join(', '); }
    this.sql = this.sql.replace("SELECT *", "SELECT " + columns);
    return this;
  }

  this.order = function(order){
    self.sql+= " \nORDER BY " + order;
    return self;
  }

  this.where = function () {
    var conditions = arguments[0];
    var _conditions = [],
        prop,
        op,
        n = self.params.length + 1;
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
              self.params.push(conditions[k][i]);
            }
            _conditions.push("\"" + prop + "\"" + ((op == "!=" || op == "<>") ? " NOT" : "") + " IN (" + array_conditions.join(", ") + ")");
            console.log("Expace " + self.params)
          } else {
            _conditions.push("\"" + prop + "\"" + op + "$" + (n++));
            self.params.push(conditions[k]);
          }
      }
    }

    self.sql+= " \nWHERE " + _conditions.join(" \nAND ");
    return self;
  };
}

Query.error = function(message) {
  return new Query(null, null)._error(message);
}

util.inherits(Query,events.EventEmitter);
module.exports = Query;

