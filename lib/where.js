var operationsMap = require("./operations_map");
var _ = require("underscore")._;
var util = require("util");

//Builds a WHERE statement for a relational table
exports.forTable = function(conditions, placeholderOffset) {
  placeholderOffset = placeholderOffset || 0; // for updates, pass the number of fields being updated so the where clause starts with the correct #

  //conditions can be a number of things - int, string, array or object
  var _conditions = [], result = {};

  //holds the values for our parameterized query
  result.params = [];
  
  //loop the key/value pairs in the conditions
  _.each(conditions, function(value, key) {

    var parts = key.trim().split(/ +/);
    var property = parts[0];
    var operation = operationsMap[parts[1]] || '=';
    
    //parameterize any non-array values
    if (!_.isArray(value)) {
      result.params.push(value);
      return _conditions.push(util.format('"%s" %s %s', property, operation, "$" + (result.params.length + placeholderOffset)));
    }

    //arrays only at this point
    var arrayConditions = [];

    //loop the array
    _.each(value, function(v) {
      result.params.push(v);
      arrayConditions.push("$" + (result.params.length + placeholderOffset));
    });

    //given that this is an array, we'll be doing an IN or NOT IN query
    _conditions.push(util.format('"%s" %s (%s)', property, operation == '!=' || operation == '<>' ? 'NOT IN' : 'IN', arrayConditions.join(', ')));
  });

  //pass back a formatted object with 'where' and 'params'
  result.where =  ' \nWHERE ' + _conditions.join(' \nAND ');
  return result;
};

//slightly repetitious, yet different enough to warrant its own method
exports.forDocument = function(conditions) {
  var _conditions = [], result = {};
  result.params = [];

  //loop conditions on the object
  _.each(conditions, function(value, key) {
    var parts = key.trim().split(/ +/);
    var property = parts[0];
    var operation = operationsMap[parts[1]] || '=';


    //if we have an array of objects, this is a deep traversal
    //we'll need to use a contains query to be sure we flex the index
    if(_.isArray(value) && _.isObject(value[0])){
      //stringify the passed-in params
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

    //comparison stuff - same as method above but this time 
    //we'll be coercing the document key values using pg's ::
    //not ideal, but it works nicely
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