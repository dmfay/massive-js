var operationsMap = require("./operations_map");
var _ = require("underscore")._;
var util = require("util");

function strip(arr) {
  return _.without(arr.map(function (s) { return s.trim(); }), '');
}

/**
 * Parse out a criterion key into something more intelligible. Supports quoted
 * field names and whitespace between components.
 * @param  {String} key Key in a format resembling "field [JSON operation+path] operation"
 * @return {Object}     [description]
 */
exports.parseKey = function (key) {
  // remove single quotes from JSON keys, then split on double quotes to break
  // out "quoted field"s safely
  var parts = strip(key.replace(/\'/g, '').split('"'));
  var isJson = false;

  if (key.indexOf('"') === -1) {
    // the field wasn't quoted, so parts[0] is the whole thing and needs to be
    // broken up by word boundaries
    parts = strip(parts[0].split(/\b/));
  } else if (parts.length > 1) {
    // the field was quoted, so parts[0] is the full field name, but parts[1]
    // may contain JSON traversal and/or operations so split that by word
    // boundaries and append
    parts = parts.concat(strip(parts.pop().split(/\b/)));
  }

  var field = parts.shift();
  var quotedField = util.format('"%s"', field);
  var operation = {};

  if (parts.length > 1) {
    // json operation. pull the op and key out and append them to the field.
    isJson = true;

    var jsonOp = parts.shift();
    var jsonKey = parts.shift();

    // fix for #>>
    // this is totally a hack but it's not going to get much better without
    // building a full-fledged parser
    if (jsonOp.lastIndexOf('{') === jsonOp.length - 1 && parts.length > 0) {
      jsonOp = '#>>';   // opening brace is otherwise part of jsonOp since there aren't word boundaries between them

      while (parts[1]) {  // go until there's one left, that'll be the closing brace and any operation
        jsonKey = jsonKey.concat(parts.shift());
      }

      // last part will contain the closing brace and any non-equality operation, so split that out
      parts = _.without([parts[0].split(/\s/)[1]], undefined);

      jsonKey = util.format('{%s}', jsonKey);
    }

    // treat numeric json keys as array indices, otherwise quote it
    if (isNaN(jsonKey)) { jsonKey = util.format("'%s'", jsonKey); }

    quotedField = util.format('%s%s%s', quotedField, jsonOp, jsonKey);
  }

  if (parts.length === 1) {
    // we're doing something other than checking equality. figure out what.
    operation = operationsMap[parts.shift()];
  }

  return {
    field: field,
    quotedField: quotedField,
    operator: operation.operator || '=',
    mutator: operation.mutator,
    isJson: isJson
  };
};

//Builds a WHERE statement for a relational table
exports.forTable = function(conditions, placeholderOffset) {
  placeholderOffset = placeholderOffset || 0; // for updates, pass the number of fields being updated so the where clause starts with the correct #

  //conditions can be a number of things - int, string, array or object
  var _conditions = [], result = {};

  //holds the values for our parameterized query
  result.params = [];

  //loop the key/value pairs in the conditions
  _.each(conditions, function(value, key) {
    var condition = exports.parseKey(key);

    if (value === null) {
      //interpolate nulls directly with is/is not
      condition.operator = condition.operator === '=' ? 'IS' : 'IS NOT';
    } else if (condition.mutator || !_.isArray(value)) {
      //parameterize any non-array or mutatey values
      if (condition.mutator) { value = condition.mutator(value); }
      result.params.push(value);
      value = "$" + (result.params.length + placeholderOffset);
    } else if (_.isArray(value)) {
      var arrayConditions = [];

      //loop the array
      _.each(value, function(v) {
        result.params.push(v);
        arrayConditions.push("$" + (result.params.length + placeholderOffset));
      });

      condition.operator = condition.operator === '=' ? 'IN' : 'NOT IN';

      value = util.format('(%s)', arrayConditions.join(', '));
    }

    return _conditions.push(util.format('%s %s %s', condition.quotedField, condition.operator, value));
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
    var condition = exports.parseKey(key);

    //if we have an array of objects, this is a deep traversal
    //we'll need to use a contains query to be sure we flex the index
    if(_.isArray(value) && _.isObject(value[0])){
      //stringify the passed-in params
      result.params.push(JSON.stringify(conditions));
      return _conditions.push(util.format("body @> $%s", result.params.length));
    }

    //if we have equality here, just use a JSON contains
    if (condition.operator === '=' && !_.isArray(value)) {
      //parse the value into stringy JSON
      var param = {};
      param[key]=value;
      result.params.push(JSON.stringify(param));
      return _conditions.push(util.format("body @> $%s", result.params.length));
    }

    //comparison stuff - same as method above but this time
    //we'll be coercing the document key values using pg's ::
    //not ideal, but it works nicely
    if (_.isBoolean(value)) {
      return _conditions.push(util.format("(body ->> '%s')::boolean %s %s", condition.field, condition.operator, value));
    } else if(_.isDate(value)) {
      result.params.push(value);
      return _conditions.push(util.format("(body ->> '%s')::timestamp %s $%d", condition.field, condition.operator, result.params.length));
    } else if(_.isNumber(value)) {
      return _conditions.push(util.format("(body ->> '%s')::decimal %s %d", condition.field, condition.operator, value));
    }

    //anything non-array handling
    if (!_.isArray(value)) {
      result.params.push(value);
      return _conditions.push(util.format("(body ->> '%s') %s $%s", condition.field, condition.operator, result.params.length));
    }

    var arrayConditions = [];

    _.each(value, function(v) {
      result.params.push(v);
      arrayConditions.push("$" + (result.params.length));
    });

    condition.operator = condition.operator === '=' ? 'IN' : 'NOT IN';

    _conditions.push(util.format("(body ->> '%s') %s (%s)", condition.field, condition.operator, arrayConditions.join(', ')));
  });

  result.where = ' \nWHERE ' + _conditions.join(' \nAND ');

  return result;
};
