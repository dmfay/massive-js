'use strict';

/** @module where */

const _ = require('lodash');
const ops = require('./operations');

/**
 * Parse out a criterion key into something more intelligible. Massive is more
 * flexible than Postgres' query parser, with more alternate aliases for
 * operations and looser rules about quoting, especially with JSON fields. This
 * necessitates some pretty gnarly parsing.
 *
 * @param  {String} key Key in a format resembling "field [JSON operation+path] operation"
 * @return {Object}     [description]
 */
const getCondition = function (key) {
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
    isJSONQuoted = false,   // was the JSON element quoted (for numeric keys)?
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
        isJSONQuoted = true;
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
    if (isJSONQuoted || isNaN(element)) { element = `'${element}'`; }
  }

  if (hasCast) {
    castType = parsed.shift();

    quotedField = `"${field}"::${castType}`;
    field = `${field}::${castType}`;
  } else {
    quotedField = `"${field}"`;
  }

  if (parsed[0]) {
    // anything remaining is part of an operator
    operation = ops(parsed.join(' ').toLowerCase());
  } else {
    operation = ops('=');
  }

  if (hasTraverser) {
    quotedField = `${quotedField}${traverser}${element}`;
  }

  return {
    rawField: field,
    field: quotedField,
    operation: operation,
    isJSON: hasTraverser
  };
};

/**
 * Generate a predicate for a normal query.
 */
const generator = function (condition) {
  if (condition.operation.mutator) {
    condition = condition.operation.mutator(condition);
  } else if (condition.value) {
    condition.params.push(condition.value);
    condition.value = `$${condition.offset}`;
  }

  return {
    predicate: `${condition.field} ${condition.operation.operator} ${condition.value}`,
    params: condition.params
  };
};

/**
 * Generate a predicate for a document query.
 */
const docGenerator = function (condition, conditions) {
  //case to check if key exist or not
  if (condition.operation.operator === 'IS' || condition.operation.operator === 'IS NOT') {
    condition.rawField = `("body" ->> '${condition.rawField}')`;
  }

  //if we have an array of objects, this is a deep traversal
  //we'll need to use a contains query to be sure we flex the index
  else if (_.isArray(condition.value) && _.isPlainObject(condition.value[0])) {
    condition.rawField = '"body"';
    condition.operation.operator = '@>';
    condition.params.push(JSON.stringify(conditions));
    condition.value = `$${condition.offset}`;
  }

  //if we have equality here, just use a JSON contains
  else if (condition.operation.operator === '=' && !_.isArray(condition.value)) {
    const param = {};
    param[condition.rawField] = condition.value;
    condition.params.push(JSON.stringify(param));
    condition.rawField = '"body"';
    condition.operation.operator = '@>';
    condition.value = `$${condition.offset}`;
  }

  else {
    // we're querying a key on the document body
    let cast = '';

    //comparison stuff - same as method above but this time
    //we'll be coercing the document key values using pg's ::
    //not ideal, but it works nicely
    if (_.isBoolean(condition.value)) { cast = '::boolean'; }
    else if(_.isNumber(condition.value)) { cast = '::decimal'; }
    else if(_.isDate(condition.value)) {
      cast = '::timestamp';
      condition.params.push(condition.value);
      condition.value = `$${condition.offset}`;
    }

    //anything non-array handling
    else if (condition.operation.mutator) {
      condition = condition.operation.mutator(condition);
    } else {
      condition.params.push(condition.value);
      condition.value = `$${condition.offset}`;
    }

    condition.rawField = `("body" ->> '${condition.rawField}')${cast}`;
  }

  return {
    predicate: `${condition.rawField} ${condition.operation.operator} ${condition.value}`,
    params: condition.params
  };
};

/**
 * Build a disjunction (logical OR).
 *
 * @param {Array} conditions - An array of nested criteria objects. Individual
 * objects will be arrayified (so an 'or' key can work with a single object).
 * @param {Number} offset - Offset prepared statement parameter ordinals.
 * @param {Function} generator - Generator function to use to build SQL
 * predicates.
 * @return {Object} A disjunction node.
 */
const generateDisjunction = (conditions, offset, generator) => {
  return _.reduce(conditions, (disjunction, subconditions) => {
    // each member of an 'or' array is itself a conjunction, so build it and
    // integrate it into the disjunction predicate structure
    const conjunction = generateConjunction(subconditions, disjunction.offset + disjunction.params.length, generator);

    disjunction.params = disjunction.params.concat(conjunction.params);
    disjunction.predicates.push(`(${conjunction.predicates.join(' AND ')})`);

    return disjunction;
  }, {
    params: [],
    predicates: [],
    offset: offset
  });
};

/**
 * Build a conjunction (logical AND).
 *
 * @param {Object} conditions - A criteria object.
 * @param {Number} offset - Offset prepared statement parameter ordinals
 * @param {Function} generator - Generator function to use to build SQL
 * predicates.
 * @return {Object} A conjunction node.
 */
const generateConjunction = (conditions, offset, generator) => {
  return _.reduce(conditions, (conjunction, value, key) => {
    if (key === 'or') {
      const disjunction = generateDisjunction(value, conjunction.offset + conjunction.params.length, generator);

      conjunction.params = conjunction.params.concat(disjunction.params);
      conjunction.predicates.push(`(${disjunction.predicates.join(' OR ')})`);

      return conjunction;
    }

    const condition = exports.getCondition(key);

    if (!!value && condition.isJSON) {
      if (_.isArray(value)) {
        condition.value = value.map(v => v.toString());
      } else {
        condition.value = value.toString();
      }
    } else {
      condition.value = value;
    }

    condition.offset = conjunction.offset + conjunction.params.length + 1;
    condition.params = [];

    const result = exports[generator](condition, conditions);

    conjunction.predicates.push(result.predicate);

    if (result.params) { conjunction.params = conjunction.params.concat(result.params); }

    return conjunction;
  }, {
    params: [],
    predicates: [],
    offset: offset || 0
  });
};

/**
 * Query conditions generator.
 *
 * @param {Object} criteria - Query criteria mapping column names (optionally
 * including operation eg 'my_field <>') to the parameter values. Predicates
 * generated from a criteria object are joined together with `and`; an `or` key
 * denotes an array of nested criteria objects, the collected predicates from
 * each of which are parenthesized and joined with `or`.
 * @param {Number} [offset=0] - Added to the token index value in the prepared
 * statement (with offset 0, parameters will start $1, $2, $3).
 * @param {String} [generator=generator] - Generator functions mutate the SQL
 * output.
 *
 * @return {Object} An object representing the query conditions. The
 * `conditions` field contains the final SQL string, the `params` field the
 * parameters for the prepared statement, and the `predicates` field the raw
 * predicate mapping.
 */
exports = module.exports = function (criteria, offset = 0, generator = 'generator') {
  if ((_.isPlainObject(criteria) && _.isEmpty(criteria)) || criteria === '*') {
    return {
      conditions: 'TRUE',
      params: []
    };
  }

  const conjunction = generateConjunction(criteria, offset, generator);

  return {
    conditions: conjunction.predicates.join(' AND '),
    params: conjunction.params
  };
};

exports.generator = generator;
exports.docGenerator = docGenerator;
exports.getCondition = getCondition;
