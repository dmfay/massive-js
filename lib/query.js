var util = require('util');
var _ = require('underscore')._;
var events =require('events');

var operationsMap = {'=': '=', '!': '!=', '>': '>', '<': '<', '>=': '>=', '<=': '<=', '!=' : '<>', '<>': '<>'};

var Query = function(sql, params, table) {
  events.EventEmitter.call(this);
  var self = this;
  self.sql = sql;
  self.params = params || [];
  self.table = table;
  self.db = table.db;
  self.columns = ""
  self.where = {};
  self.limit = "";
  self.order = "";

  self.on('newListener', function(eventName) {
    if(eventName === 'row') { self.each(); }
  });

  self.order = function() {
    self.sql += util.format(" \nORDER BY %s", arguments[0]);
    return self;
  };

  self.limit = function() {
    if(arguments.length > 1) {
      self.sql += util.format(" \nLIMIT(%d,%d)", arguments[0], arguments[1]);
    } else {
      self.sql += " \nLIMIT " + arguments[0];
    }
    return self;
  };

  self.raiseError = function(err) {
    self.error = err;
    return self;
  };

  self.parseArgs = function(args) {
    if(_.isFunction(args[0])) { return self; }

    var columns = " * ";
    var where = {};
    //if the first argument is an array, columns are specified
    if(args.length > 0 && _.isArray(args[0])){
      columns = args[0].join(",");
      self.sql = self.sql.replace("*", columns);
    //if the second arg has {columns : "..."} then columns are also specified
    }else if(args.length > 1 && args[1].columns) {
      self.sql = self.sql.replace("*", args[1].columns);
    //if the argument is numeric (instead of an object) - default it to a PK lookup
    }else if (args.length > 0 && _.isNumber(args[0])){
      var criteria = {};
      criteria[self.table.pk] = args[0];
      self.where(criteria);
    //if the argument is an object, parse a where statement
    }else if (args.length > 0 && _.isObject(args[0])){
      self.where(args[0]);
    }
    return self;
  };

  self.where = function(conditions) {
    if (_.isUndefined(conditions)) { return self; }

    if(_.isNumber(conditions)) {
      self.sql += util.format(" \nWHERE \"%s\" = %d", self.table.pk, conditions);
      return self;
    }else if (_.isString(conditions)) {
      self.sql += util.format(" \nWHERE \"%s\" = %s", self.table.pk, self.db.placeholder(self.params.length+1));
      self.params.push(conditions);
      return self;
    }

    var sql = '';
    var params = [];

    if(_.isObject(conditions) &! _.isArray(conditions)) {
      var _conditions = [];
      var seed = self.params.length;

      _.each(conditions, function(value, key) {
        var parts = key.trim().split(/ +/);
        var property = parts[0];
        var operation = operationsMap[parts[1]] || '=';

        if (_.isBoolean(value) || _.isNumber(value)) {
          _conditions.push(util.format('"%s" %s %d', property, operation, value));
        } else if (_.isArray(value)) {
          var arrayConditions = [];
          _.each(value, function(v) {
            arrayConditions.push(self.db.placeholder(++seed));
            params.push(v);
          });
          _conditions.push(util.format('"%s" %s (%s)', property, operation == '!=' || operation == '<>' ? 'NOT IN' : 'IN', arrayConditions.join(', ')));
        } else {
          _conditions.push(util.format('"%s" %s %s', property, operation, self.db.placeholder(++seed)));
          params.push(value);
        }
      });
      sql = ' \nWHERE ' + _conditions.join(' \nAND ');
    };
    self.sql += sql;
    self.params.push(params);
    self.params = _.flatten(self.params);
    return self;
  };

  //execution uses the Client
  self.execute = function(callback) {
    self.db.execute(self.sql, self.params, function(err,result,client) {
      if(callback) { callback(err,result,client); }
      self.emit("executed",client);
    });
  };

  //built-in iteration. This fetches the results using a callback
  //TODO: use the PG client's built in streamer for this
  self.each = function(callback) {
    self.db.execute(self.sql,self.params, function(err,results){
      if(err && callback) {
        return callback(err,self.raiseError(err));
      }
      _.each(results, function(r) {
        if(callback) { callback(null,r); }
        self.emit("row", r);
      });
      self.emit("end");
    });
  };

  self.first = function(callback) {
    self.sql += " LIMIT(1) ";
    self.db.execute(self.sql,self.params, function(err,results) {
      if (err) { callback(err,self.raiseError(err)); }
      else { callback(null,results[0]); }
    });
  };

  self.last = function(callback) {
    self.sql += util.format(" ORDER BY %s DESC LIMIT(1) ", this.table.pk);
    self.db.execute(self.sql,self.params, function(err,results) {
      if(err) { callback(err,self.raiseError(err)); }
      else { callback(null,results[0]); }
    });
  };
};

util.inherits(Query, events.EventEmitter);

module.exports = Query