var ArgTypes = require("./arg_types");
var operationsMap = require("./operations_map");
var _ = require("underscore")._;
var util = require("util");
var isUuid = new RegExp(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

function strip(arr) {
  return _.without(arr.map(function (s) { return s.trim(); }), '');
}

function getOp(str) {
  str = str.toLowerCase();

  return _.reduce(operationsMap, function (acc, v, k) {
    var idx = str.indexOf(k);

    // if we matched something (eg '!' for 'not equal') previously and now have
    // matched a longer operator (eg '!~~' for 'not like'), the more specific
    // operator is the correct one.
    if (idx > -1 && v.operator.length > acc.key.length) {
      // '>' is a special case because it can also appear as part of a JSON
      // traversal operator, so we need to be sure that's not what we're seeing
      if (k !== '>' || (str.indexOf('->>', idx - 1) === -1 && str.indexOf('#>>', idx - 1) === -1)) {
        v.key = k;  // save the original key so we can split on it even if user passed in alternate form

        return v;
      }
    }

    return acc;
  }, {key: ''});
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
  var parts = strip(key.replace(/\'/g, '').split('"')),
    operation = getOp(key),
    separators = ['::', '\\-\\>\\>','\\#\\>\\>'],
    re;

  if (operation.key) {
    // we found an operation, include the escaped key in the separators when we tokenize
    separators.push(operation.key.replace(/([^a-zA-Z0-9\s])/g, '\\$1'));
  }

  // capture separators in output array
  re = new RegExp(util.format("(%s)", separators.join('|')), 'i');

  if (parts.length === 0) {
    // the field wasn't quoted, so parts[0] is the whole thing
    parts = strip(parts[0].split(re));
  } else {
    // the field was quoted, so parts[0] is the full field name, but parts[1]
    // may contain JSON traversal and/or operations so split it up on those
    parts = parts.concat(strip(parts.pop().split(re)));
  }

  var field = parts.shift(),
    quotedField;

  if (parts[0] === '::') {
    // casting
    var type = parts.shift() && parts.shift();

    quotedField = util.format('"%s"::%s', field, type);
    field = util.format('%s::%s', field, type);
  } else {
    quotedField = util.format('"%s"', field);
  }

  if (parts[0] === '->>' || parts[0] === '#>>') {
    // json operation. pull the op and key out and append them to the field.
    var jsonOp = parts.shift();
    var jsonKey = parts.shift();

    // treat numeric json keys as array indices, otherwise quote it
    if (isNaN(jsonKey)) { jsonKey = util.format("'%s'", jsonKey); }

    quotedField = util.format('%s%s%s', quotedField, jsonOp, jsonKey);
  }

  return {
    field: field,
    quotedField: quotedField,
    operator: operation.operator || '=',
    mutator: operation.mutator
  };
};

exports.predicate = function (result, condition, value) {
  if (value === null) {
    //interpolate nulls directly with is/is not
    condition.operator = condition.operator === '=' ? 'IS' : 'IS NOT';
  } else if (condition.mutator || !_.isArray(value)) {
    //parameterize any non-array or mutatey values
    if (condition.mutator) { value = condition.mutator(value); }
    result.params.push(value);
    value = util.format("$%s", result.params.length + result.offset);
  } else if (_.isArray(value)) {
    var arrayConditions = [];

    //loop the array
    _.each(value, function(v) {
      result.params.push(v);
      arrayConditions.push(util.format("$%s", result.params.length + result.offset));
    });

    condition.operator = condition.operator === '=' ? 'IN' : 'NOT IN';

    value = util.format('(%s)', arrayConditions.join(', '));
  }

  result.predicates.push(util.format('%s %s %s', condition.quotedField, condition.operator, value));

  return result;
};

exports.docPredicate = function (result, condition, value, conditions) {
  //if we have an array of objects, this is a deep traversal
  //we'll need to use a contains query to be sure we flex the index
  if(_.isArray(value) && _.isObject(value[0])) {
    //stringify the passed-in params
    result.params.push(JSON.stringify(conditions));
    result.predicates.push(util.format("body @> $%s", result.params.length + result.offset));
  }

  //if we have equality here, just use a JSON contains
  else if (condition.operator === '=' && !_.isArray(value)) {
    //parse the value into stringy JSON
    var param = {};
    param[condition.field]=value;
    result.params.push(JSON.stringify(param));
    result.predicates.push(util.format("body @> $%s", result.params.length + result.offset));
    return result;
  }

  //comparison stuff - same as method above but this time
  //we'll be coercing the document key values using pg's ::
  //not ideal, but it works nicely
  else if (_.isBoolean(value)) {
    result.predicates.push(
      util.format("(body ->> '%s')::boolean %s %s", condition.field, condition.operator, value)
    );
  } else if(_.isDate(value)) {
    result.params.push(value);
    result.predicates.push(
      util.format("(body ->> '%s')::timestamp %s $%d",
        condition.field,
        condition.operator,
        result.params.length + result.offset)
    );
  } else if(_.isNumber(value)) {
    result.predicates.push(
      util.format("(body ->> '%s')::decimal %s %d", condition.field, condition.operator, value)
    );
  }

  //anything non-array handling
  else if (!_.isArray(value)) {
    result.params.push(value);
    result.predicates.push(
      util.format("(body ->> '%s') %s $%s",
        condition.field,
        condition.operator,
        result.params.length + result.offset)
    );
  } else {
    var arrayConditions = [];

    _.each(value, function(v) {
      result.params.push(v);
      arrayConditions.push("$" + (result.params.length + result.offset));
    });

    condition.operator = condition.operator === '=' ? 'IN' : 'NOT IN';

    result.predicates.push(
      util.format("(body ->> '%s') %s (%s)",
        condition.field,
        condition.operator,
        arrayConditions.join(', '))
    );
  }

  return result;
};

exports.generate = function (result, conditions, generator) {
  _.each(conditions, function(value, key) {
    var condition = exports.parseKey(key);

    if (condition.field === 'or') {
      if (!_.isArray(value)) { value = [value]; }

      var groupResult = _.reduce(value, function (acc, v) {
        // assemble predicates for each subgroup in this 'or' array
        var subResult = exports.generate({
          params: [],
          predicates: [],
          offset: result.params.length + acc.offset   // ensure the offset from predicates outside the subgroup is counted
        }, v, generator);

        // encapsulate and join the individual predicates with AND to create the complete subgroup predicate
        acc.predicates.push(util.format('(%s)', subResult.predicates.join(' AND ')));
        acc.params = acc.params.concat(subResult.params);
        acc.offset += subResult.params.length;

        return acc;
      }, {
        params: [],
        predicates: [],
        offset: result.offset
      });

      // join the compiled subgroup predicates with OR, encapsulate, and push the
      // complex predicate ("((x = $1 AND y = $2) OR (z = $3))") onto the result object
      result.params = result.params.concat(groupResult.params);
      result.predicates.push(util.format('(%s)', groupResult.predicates.join(' OR ')));
    } else {
      // no special behavior, just add this predicate and modify result in-place
      result = exports[generator](result, condition, value, conditions);
    }
  });

  return result;
};

exports.forTable = function () {
  var args = ArgTypes.forArgs(arguments);

  if (_.isEmpty(args.conditions)) {
    return {
      where: args.prefix + 'TRUE',
      params: []
    };
  }

  var result = exports.generate({
    params: [],
    predicates: [],
    offset: args.placeholderOffset
  }, args.conditions, args.generator);

  return {
    where: args.prefix + result.predicates.join(' \nAND '),
    params: result.params
  };
};

exports.isPkSearch = function(conditions) {
  return _.isNumber(conditions) || (_.isString(conditions) && isUuid.test(conditions));
};
