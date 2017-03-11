const _ = require('lodash');

const traversers = new RegExp(/[-#]>>/);
const cast = new RegExp(/(::\w+)/);
const sanitizeForRegexp = new RegExp(/([^a-zA-Z0-9\s])/g);

const literalizeArray = (arr) => {
  if (!_.isArray(arr)) { return arr; }

  const sanitizedValues = arr.map(function (v) {
    if (v.search(/[,{}]/) !== -1) { return `"${v}"`; }

    return v;
  });

  return `{${sanitizedValues.join(',')}}`;
};

const ops = {
  // basic comparison
  '=': {operator: '='},
  '!': {operator: '<>'},
  '>': {operator: '>'},
  '<': {operator: '<'},
  '>=': {operator: '>='},
  '<=': {operator: '<='},
  '!=': {operator: '<>'},
  '<>': {operator: '<>'},
  // array
  '@>': {operator: '@>', mutator: literalizeArray},
  '<@': {operator: '<@', mutator: literalizeArray},
  '&&': {operator: '&&', mutator: literalizeArray},
  // pattern matching
  '~~': {operator: 'LIKE'},
  'like': {operator: 'LIKE'},
  '!~~': {operator: 'NOT LIKE'},
  'not like': {operator: 'NOT LIKE'},
  '~~*': {operator: 'ILIKE'},
  'ilike': {operator: 'ILIKE'},
  '!~~*': {operator: 'NOT ILIKE'},
  'not ilike': {operator: 'NOT ILIKE'},
  'similar to': {operator: 'SIMILAR TO'},
  'not similar to': {operator: 'NOT SIMILAR TO'},
  // regex
  '~': {operator: '~'},
  '!~': {operator: '!~'},
  '~*': {operator: '~*'},
  '!~*': {operator: '!~*'},
  // distinct
  'is distinct from': {operator: 'IS DISTINCT FROM'},
  'is not distinct from': {operator: 'IS NOT DISTINCT FROM'}
};

/**
 * Remove whitespace from an array of token strings.
 */
const strip = (arr) => {
  return _.without(arr.map(function (s) { return s.trim(); }), '');
};

/**
 * Get the cast ('::destinationType') portion of a predicate key.
 */
const getCast = (str) => {
  const match = cast.exec(str);

  if (match) { return match[1]; }

  return '';
};

/**
 * Get any JSON traversal operator present in a predicate key.
 */
const getJSONTraverser = (str) => {
  const match = traversers.exec(str);

  if (match) { return match[0]; }

  return '';
};

/**
 * Find the operation specified in a predicate key.
 */
const getOperation = (str) => {
  str = str.toLowerCase().replace(traversers, '');  // remove JSON pathing and make case consistent

  return _.reduce(ops, function (found, val, key) {
    // if we matched something (eg '!' for 'not equal') previously and now have
    // matched a longer operator (eg '!~~' for 'not like'), the more specific
    // operator is the correct one.
    if (str.indexOf(key) > -1 && val.operator.length > found.key.length) {
      // save the operation key as originally entered for splitting -- we
      // don't want to be looking for '<>' when the user gave us '!='.
      return _.assign(val, { key: key });
    }

    return found;
  }, {key: ''});
};

const quote = (str, delim='"') => {
  if (str && !str.startsWith(delim)) {
    return `${delim}${str}${delim}`;
  }

  return str;
};

const unquote = (str, delim='"') => {
  if (str && str.startsWith(delim) && str.endsWith(delim)) {
    return str.slice(1, -1);
  }

  return str;
};

/**
 * Tokenize the predicate key and determine the field and operation.
 */
const getCondition = function (key) {
  const traverser = getJSONTraverser(key);
  const operation = getOperation(key);

  const splitOn = ['::'];

  if (traverser) { splitOn.push(traverser); }
  if (operation.key) { splitOn.push(operation.key.replace(sanitizeForRegexp, '\\$1')); }

  const tokenizer = new RegExp(`${splitOn.join('|')}`, 'i');

  const tokens = strip(key.split(tokenizer));

  const rawField = unquote(tokens.shift());
  const field = quote(rawField);
  let jsonPath = '';

  if (traverser) {
    const token = tokens.shift();

    if (!isNaN(parseInt(token))) { jsonPath = token; }
    else { jsonPath = quote(token, "'"); }
  }

  const cast = getCast(key);

  return {
    rawField: rawField,
    field: `${field}${traverser}${jsonPath}${cast}`,
    operator: operation.operator || '=',
    mutator: operation.mutator,
    isJSON: !!traverser
  };
};

/**
 * Build an IN (x, y, z) predicate.
 */
const buildIn = function (condition) {
  condition.operator = condition.operator === '=' ? 'IN' : 'NOT IN';

  const inList = _.reduce(condition.value, (list, v) => {
    condition.params.push(v);

    return list.concat([`$${condition.offset++}`]);
  }, []);

  condition.value = `(${inList.join(', ')})`;

  return condition;
};

/**
 * Generate a predicate for a normal query.
 */
const generator = function (condition) {
  if (condition.value === null) {
    //interpolate nulls directly with is/is not
    condition.operator = condition.operator === '=' ? 'IS' : 'IS NOT';
  } else if (condition.mutator || !_.isArray(condition.value)) {
    //parameterize any non-array or mutatey values
    if (condition.mutator) { condition.value = condition.mutator(condition.value); }

    condition.params.push(condition.value);

    condition.value = `$${condition.offset}`;
  } else if (_.isArray(condition.value)) {
    condition = buildIn(condition);
  }

  return {
    predicate: `${condition.field} ${condition.operator} ${condition.value}`,
    params: condition.params
  };
};

/**
 * Generate a predicate for a document query.
 */
const docGenerator = function (condition, conditions) {
  //if we have an array of objects, this is a deep traversal
  //we'll need to use a contains query to be sure we flex the index
  if(_.isArray(condition.value) && _.isObject(condition.value[0])) {
    condition.rawField = '"body"';
    condition.operator = '@>';
    condition.params.push(JSON.stringify(conditions));
    condition.value = `$${condition.offset}`;
  }

  //if we have equality here, just use a JSON contains
  else if (condition.operator === '=' && !_.isArray(condition.value)) {
    const param = {};
    param[condition.rawField] = condition.value;
    condition.params.push(JSON.stringify(param));
    condition.rawField = '"body"';
    condition.operator = '@>';
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
    else if (!_.isArray(condition.value)) {
      condition.params.push(condition.value);
      condition.value = `$${condition.offset}`;
    } else {
      condition = buildIn(condition);
    }

    condition.rawField = `("body" ->> '${condition.rawField}')${cast}`;
  }

  return {
    predicate: `${condition.rawField} ${condition.operator} ${condition.value}`,
    params: condition.params
  };
};

/**
 * Build a disjunction (logical OR).
 */
const generateDisjunction = (conditions, offset, generator) => {
  if (!_.isArray(conditions)) { conditions = [conditions]; }

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

exports = module.exports = function (conditions = {}, offset = 0, prefix = '\nWHERE ', generator = 'generator') {
  if ((_.isObject(conditions) && _.isEmpty(conditions)) || conditions === '*') {
    return {
      conditions: prefix + 'TRUE',
      params: []
    };
  }

  const conjunction = generateConjunction(conditions, offset, generator);

  return {
    conditions: prefix + conjunction.predicates.join(' \nAND '),
    predicates: conjunction.predicates,
    params: conjunction.params
  };
};

exports.generator = generator;
exports.docGenerator = docGenerator;
exports.getCondition = getCondition;
