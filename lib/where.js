var operationsMap = require("./operations_map");
var _ = require("underscore")._;
var util = require("util");

exports.forTable = function(conditions) {
  var _conditions = [], result = {};
  result.params = [];
  _.each(conditions, function(value, key) {
    var parts = key.trim().split(/ +/);
    var property = parts[0];
    var operation = operationsMap[parts[1]] || '=';

    if (_.isBoolean(value) || _.isNumber(value)) {
      return _conditions.push(util.format('"%s" %s %d', property, operation, value));
    }

    if (!_.isArray(value)) {
      result.params.push(value);
      return _conditions.push(util.format('"%s" %s %s', property, operation, "$" + (result.params.length)));
    }

    var arrayConditions = [];
    _.each(value, function(v) {
      result.params.push(v);
      arrayConditions.push("$" + (result.params.length));
    });
    _conditions.push(util.format('"%s" %s (%s)', property, operation == '!=' || operation == '<>' ? 'NOT IN' : 'IN', arrayConditions.join(', ')));
  });

  result.where =  ' \nWHERE ' + _conditions.join(' \nAND ');
  return result;
};


exports.forDocument = function(conditions) {
  var _conditions = [], result = {};
  result.params = [];

  _.each(conditions, function(value, key) {
    var parts = key.trim().split(/ +/);
    var property = parts[0];
    var operation = operationsMap[parts[1]] || '=';


    //if we have an array of objects, this is a deep traversal
    if(_.isArray(value) && _.isObject(value[0])){
      result.params.push(JSON.stringify(conditions));
      return _conditions.push(util.format("body @> %s", "$" + (result.params.length)));
    };

    //if we have equality here, just use a JSON contains
    if(operation === '=' && !_.isArray(value)){
      //parse the value into stringy JSON
      var param = {};
      param[key]=value;
      result.params.push(JSON.stringify(param));
      return _conditions.push(util.format("body @> %s", "$" + (result.params.length)));
    }

    //comparison stuff
    if (_.isBoolean(value)){
      return _conditions.push(util.format("(body ->> '%s')::boolean %s %s", property, operation, value));
    }else if(_.isDate(value)) {
      result.params.push(value);
      return _conditions.push(util.format("(body ->> '%s')::timestamp %s $%d", property, operation, result.params.length));

    }else if(_.isNumber(value)) {
      return _conditions.push(util.format("(body ->> '%s')::decimal %s %d", property, operation, value));
    }

    //anything non-array handling
    if (!_.isArray(value)) {
      result.params.push(value);
      return _conditions.push(util.format("(body ->> '%s') %s %s", property, operation, "$" + (result.params.length)));
    }

    var arrayConditions = [];

    _.each(value, function(v) {
      result.params.push(v);
      arrayConditions.push("$" + (result.params.length));      
    });
    _conditions.push(util.format("(body ->> '%s') %s (%s)", property, operation == '!=' || operation == '<>' ? 'NOT IN' : 'IN', arrayConditions.join(', ')));
  });

  result.where =  ' \nWHERE ' + _conditions.join(' \nAND ');
  return result;
};