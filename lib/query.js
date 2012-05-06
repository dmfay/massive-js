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

  self.on('newListener', function(eventName) {
    if(eventName === 'row') { self.each(); }
  });

  self.order = function(where) {
    return self._append(" \nORDER BY %s", where);
  };

  self.limit = function(count, offset) {
    return _.isUndefined(offset) ? self._append(" \nLIMIT %d", count) : self._append(" \nLIMIT(%d,%d)", count, offset);
  };

  self.raiseError = function(err) {
    self.error = err;
    return self;
  };

  self.parseArgs = function(args) {
    if(_.isFunction(args[0])) { return self; }

    var where = {};

    if(args.length > 0 && _.isArray(args[0])) {               //if the first argument is an array, columns are specified
      self.sql = self.sql.replace("*", args[0].join(","));
    } else if(args.length > 1 && args[1].columns) {           //if the second arg has {columns : "..."} then columns are also specified
      self.sql = self.sql.replace("*", args[1].columns);
    } else if (args.length > 0 && _.isNumber(args[0])) {      //if the argument is numeric (instead of an object) - default it to a PK lookup
      var criteria = {};
      criteria[self.table.pk] = args[0];
      self.where(criteria);
    } else if (args.length > 0 && _.isObject(args[0])){       //if the argument is an object, parse a where statement
      self.where(args[0]);
    }
    return self;
  };

  self.where = function(conditions) {
    if (_.isUndefined(conditions)) {
      return self;
    }
    if(_.isNumber(conditions)) {
      return self._append(" \nWHERE \"%s\" = %d", self.table.pk, conditions);
    }
    if (_.isString(conditions)) {
      self.params.push(conditions);
      return self._append(" \nWHERE \"%s\" = %s", self.table.pk, self.db.placeholder(self.params.length));
    }

    var _conditions = [];
    _.each(conditions, function(value, key) {
      var parts = key.trim().split(/ +/);
      var property = parts[0];
      var operation = operationsMap[parts[1]] || '=';

      if (_.isBoolean(value) || _.isNumber(value)) {
        return _conditions.push(util.format('"%s" %s %d', property, operation, value));
      }

      if (!_.isArray(value)) {
        self.params.push(value);
        return _conditions.push(util.format('"%s" %s %s', property, operation, self.db.placeholder(self.params.length)));
      }

      var arrayConditions = [];
      _.each(value, function(v) {
        self.params.push(v);
        arrayConditions.push(self.db.placeholder(self.params.length));
      });
      _conditions.push(util.format('"%s" %s (%s)', property, operation == '!=' || operation == '<>' ? 'NOT IN' : 'IN', arrayConditions.join(', ')));
    });

    return self._append(' \nWHERE ' + _conditions.join(' \nAND '));
  };

  //execution uses the Client
  self.execute = function(callback) {
    self.db.execute(self.sql, self.params, function(err,result) {
      if(callback) { callback(err, result); }
      self.emit("executed",client);
    });
  };

  //built-in iteration. This fetches the results using a callback
  //TODO: use the PG client's built in streamer for this
  self.each = function(callback) {
    self.db.execute(self.sql,self.params, function(err,results){
      if(err && callback) {
        return callback(err, self.raiseError(err));
      }
      _.each(results, function(r) {
        if(callback) { callback(null, r); }
        self.emit("row", r);
      });
      self.emit("end");
    });
  };

  self.first = function(callback) {
    self.append(" LIMIT(1) ").execute(callback);
  };

  self.last = function(callback) {
    self.append("ORDER BY %s DESC LIMIT(1) ", this.table.pk).execute(callback);
  };

  self._append = function(sql) {
    self.sql += arguments.length == 1 ? sql : util.format.apply(null, _.toArray(arguments));
    return self;
  };
};

util.inherits(Query, events.EventEmitter);

module.exports = Query