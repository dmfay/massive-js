var ArgTypes = require("./arg_types");
var operationsMap = require("./operations_map");
var _ = require("underscore")._;
var util = require("util");
var isUuid = new RegExp(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

/**
 * Parse out a criterion key into something more intelligible. Massive is more
 * flexible than Postgres' query parser, with more alternate aliases for
 * operations and looser rules about quoting, especially with JSON fields. This
 * necessitates some pretty gnarly parsing.
 *
 * @param  {String} key Key in a format resembling "field [JSON operation+path] operation"
 * @return {Object}     [description]
 */
exports.parseKey = function (key) {
  // remove single quotes from JSON keys, then split on double quotes to break
  // out "quoted field"s safely
  key = key.trim();

  var i = 0,
    char = key.charAt(i),
    parsed = [[]],          // collect token arrays
    buffer = parsed[0],     // start with the first token
    inQuotedField = false,  // to turn off token break on whitespace
    hasTraverser = false,   // final structure depends on presence of a JSON op
    inTraverser = false,    // distinguish > in traversers from > as an operation
    hasCast = false;        // make sure we pull the appropriate token for castType

  do {
    switch (char) {
      case '"':
        // quoted field
        if (i === 0) {
          inQuotedField = true;   // just starting out, use the initial token
        } else {
          inQuotedField = false;  // finishing the quoted field, new token
          buffer = parsed[parsed.push([]) - 1];
        }
        break;
      case "'":
        //starting or ending a json element; new token
        buffer = parsed[parsed.push([]) - 1];
        break;
      case ':':
        // cast; new token, but we ignore the : characters since we only care about type
        if (!hasCast) {
          hasCast = true;

          buffer = parsed[parsed.push([]) - 1];
        }
        break;
      case '-': case '#':
        // starting a json traverser; set up tracking and begin a new token
        hasTraverser = true;
        inTraverser = true;   // have to track for >
        buffer = parsed[parsed.push([]) - 1];
        buffer.push(char);
        break;
      case ' ': case '\t': case '\r': case '\n':
        // whitespace; separates tokens everywhere except in quoted fields
        if (!inQuotedField) {
          buffer = parsed[parsed.push([]) - 1];
          break;  // if this is a quoted field, fall through to default
        }
      case '>':   // eslint-disable-line no-fallthrough
        // could be a json traverser, could be an operator. if the former *and*
        // it's the third and last character of a traverser, we're done with
        // this token; otherwise, just append it to the current buffer.
        if (inTraverser) {
          buffer.push(char);

          if (buffer.length === 3) {
            inTraverser = false;
            buffer = parsed[parsed.push([]) - 1];
          }

          break;
        }
      default:    // eslint-disable-line no-fallthrough
        buffer.push(char);
        break;
    }

    i++;
  } while (char = key.charAt(i)); // eslint-disable-line no-cond-assign

  parsed = parsed.reduce(function (acc, p) {
    var str = p.join('').trim();

    if (str) { acc.push(str); }

    return acc;
  }, []);

  var field = parsed.shift(), traverser, element, castType, operation;
  var quotedField;

  if (hasTraverser) {
    traverser = parsed.shift();
    element = parsed.shift();

    // treat numeric json keys as array indices, otherwise quote it
    if (isNaN(element)) { element = util.format("'%s'", element); }
  }

  if (hasCast) {
    castType = parsed.shift();

    quotedField = util.format('"%s"::%s', field, castType);
    field = util.format('%s::%s', field, castType);
  } else {
    quotedField = util.format('"%s"', field);
  }

  if (parsed[0]) {
    // anything remaining is part of an operator
    operation = operationsMap[parsed.join(' ').toLowerCase()];
  } else {
    operation = operationsMap['='];
  }

  if (hasTraverser) {
    quotedField = util.format('%s%s%s', quotedField, traverser, element);
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
    condition.operator = (condition.operator === '=' || condition.operator === 'IS') ? 'IS' : 'IS NOT';
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
  //case to check if key exist or not
  if (value === null && (condition.operator === 'IS' || condition.operator === 'IS NOT')) {
    result.predicates.push(
      util.format("(body ->> '%s') %s null", condition.field, condition.operator)
    );
  }

  //if we have an array of objects, this is a deep traversal
  //we'll need to use a contains query to be sure we flex the index
  else if (_.isArray(value) && _.isObject(value[0])) {
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
