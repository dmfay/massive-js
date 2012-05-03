var events =require('events');
var util = require('util');
var massive = require('./index');
var _ = require('underscore')._;

var Query = function(_sql,_params){

  var self = this;
  events.EventEmitter.call(self);

  self.params = _params || [];
  self.sql = _sql;

  self.on('newListener', function(eventName){
    console.log('Adding a listener for ' + eventName);
    if(eventName === 'row'){
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
    return self.sql.indexOf('SELECT') > -1;
  }
  this.limit = function (count, offset){
    var _limit = _.isUndefined(offset) ? util.format(' \nLIMIT %d', count) : util.format(' \nLIMIT(%d, %d)', count, offset);
    self.sql += _limit;
    return self;
  }

  this.columns = function(columns) {
    if (arguments.length > 1) { columns = _.toArray(arguments); }
    if (_.isArray(columns)) { columns = columns.join(', '); }
    self.sql = self.sql.replace('SELECT *', 'SELECT ' + columns);
    return self;
  }

  this.order = function(order) {
    self.sql += ' \nORDER BY ' + order;
    return self;
  }

  var _operations = {'=': '=', '!': '!=', '>': '>', '<': '<', '>=': '>=', '<=': '<=', '!=' : '<>', '<>': '<>'}
  this.where = function(conditions) {
    var _conditions = [];
    var seed = self.params.length;

    _.each(conditions, function(value, key) {
      var parts = key.trim().split(/ +/);
      var property = parts[0];
      var operation = _operations[parts[1]] || '=';

      if (_.isBoolean(value) || _.isNumber(value)) {
        _conditions.push(util.format('"%s" %s %d', property, operation, value));
      } else if (_.isArray(value)) {
        var arrayConditions = [];
        _.each(value, function(v) {
          arrayConditions.push('$' + ++seed);
          self.params.push(v);
        });
        _conditions.push(util.format('"%s" %s (%s)', property, operation == '!=' || operation == '<>' ? 'NOT IN' : 'IN', arrayConditions.join(', ')));
      } else {
        _conditions.push(util.format('"%s" %s %s', property, operation, '$' + ++seed));
        self.params.push(value);
      }
    });

    self.sql+= ' \nWHERE ' + _conditions.join(' \nAND ');
    return self;
  };
}

Query.error = function(message) {
  return new Query(null, null)._error(message);
}

util.inherits(Query,events.EventEmitter);
module.exports = Query;