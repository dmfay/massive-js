'use strict';

const _ = require('lodash');
const util = require('util');
const Entity = require('./entity');
const EventEmitter = require('events');
const SingleValueStream = require('./util/single-value-stream');

/**
 * An executable function or script.
 *
 * @class
 * @extends Entity
 * @param {Object} spec - An expanded {@linkcode Entity} specification:
 * @param {Object} spec.db - A {@linkcode Database}.
 * @param {String} spec.name - The table or view's name.
 * @param {String} spec.schema - The name of the schema owning the table or
 * @param {String|QueryFile} spec.sql - A function invocation statement or a
 * pg-promise QueryFile.
 * @param {Number} spec.paramCount - Number of parameters the executable
 * expects.
 * @param {Boolean} spec.isVariadic - Whether a database function accepts
 * variable-length argument lists as the last parameter.
 * @param {Boolean} spec.enhancedFunctions - True to enable single row/value
 * results processing.
 * @param {Boolean} spec.singleRow - If true, return the first result row as an
 * object (with enhancedFunctions).
 * @param {Boolean} spec.singleValue - If true, return results as a primitive
 * or primitives (with enhancedFunctions).
 */
const Executable = function (spec) {
  Entity.apply(this, arguments);

  this.sql = spec.sql;
  this.paramCount = spec.paramCount;  // this actually only matters for QueryFiles since functions can have overloads
  this.isVariadic = !!spec.isVariadic;  // only for db functions
  this.singleRow = spec.enhancedFunctions && spec.singleRow;
  this.singleValue = spec.enhancedFunctions && spec.singleValue;
};

util.inherits(Executable, Entity);

/**
 * Invoke the function or script.
 *
 * @param {Object} [options] - {@link https://dmfay.github.io/massive-js/options.html|Result processing options}.
 * @return {Promise} Execution results as an array, unless options.single is
 * toggled or enhanced functions are enabled and the function returns a single
 * value.
 */
Executable.prototype.invoke = function () {
  let statement = this.sql,
    args,
    opts = {single: this.singleRow || false};

  if (_.isArray(arguments[0]) || (_.isPlainObject(arguments[0]) && !_.isString(this.sql) && !!this.paramCount)) {
    // arrays are always a full parameter list
    // objects are never parameters for database functions, only QueryFiles
    // (and only if it takes parameters)
    args = arguments[0];
    opts = _.defaults(_.last(arguments), opts);
  } else {
    args = Array.prototype.slice.call(arguments);

    if (_.isString(this.sql) && _.isPlainObject(_.last(args))) {
      // function overloads mess with paramCount, but since they can't use
      // named parameters we can just check to see if there's an object
      opts = _.defaults(args.pop(), opts);
    } else if (arguments.length === this.paramCount + 1) {
      opts = _.defaults(args.pop(), opts);
    }
  }

  if (this.isVariadic) {
    const params = _.times(args.length, i => `$${i + 1}`).join(',');

    statement = `SELECT * FROM "${this.schema}"."${this.name}"(${params})`;
  }

  return this.db.query(statement, args, opts).then(result => {
    if (result instanceof EventEmitter && typeof result.read === 'function') {
      if (this.singleValue) { result = result.pipe(new SingleValueStream()); }

      return result;
    }

    let data = result;

    if (this.singleValue) {
      try {
        data = _.isArray(data) ? data.map(SingleValueStream.singleValue) : SingleValueStream.singleValue(data);
      } catch (e) {
        return this.db.instance.$config.promise.reject(e);
      }
    }

    return data;
  });
};

module.exports = Executable;
