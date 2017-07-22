'use strict';

const _ = require('lodash');
const util = require('util');
const singleValue = require('./util/single-value');
const Entity = require('./entity');
const EventEmitter = require('events');
const SingleValueStream = require('./util/single-value-stream');

/**
 * An executable function or script.
 *
 * @class
 * @extends Entity
 * @param {Object} args
 * @param {String|QueryFile} args.sql - A function invocation statement or a
 * pg-promise QueryFile.
 * @param {Number} args.paramCount - Number of parameters the executable
 * expects.
 * @param {Boolean} args.enhancedFunctions - True to enable single row/value
 * results processing.
 * @param {Boolean} args.singleRow - If true, return the first result row as an
 * object (with enhancedFunctions).
 * @param {Boolean} args.singleValue - If true, return results as a primitive
 * or primitives (with enhancedFunctions).
 */
const Executable = function (args) {
  Entity.apply(this, arguments);

  this.sql = args.sql;
  this.paramCount = args.paramCount;  // this actually only matters for QueryFiles since functions can have overloads
  this.singleRow = args.enhancedFunctions && args.singleRow;
  this.singleValue = args.enhancedFunctions && args.singleValue;
};

util.inherits(Executable, Entity);

/**
 * Invoke the function or script.
 *
 * @param {Array|...Object} [args] Function arguments or prepared statement
 * parameters.
 * @param {Object} [options] Query options.
 * @param {Boolean} [options.single] - True to force returning a single object
 * instead of an array of results.
 * @param {Boolean} [options.stream] - True to return a stream instead of a
 * resultset.
 * @return {Promise} Execution results as an array, unless options.single is
 * toggled or enhanced functions are enabled and the function returns a single
 * value.
 */
Executable.prototype.invoke = function () {
  let args, opts = {single: this.singleRow || false};

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

  return this.db.query(this.sql, args, opts).then(result => {
    if (result instanceof EventEmitter && typeof result.read === "function") {
      if (this.singleValue) { result = result.pipe(SingleValueStream()); }

      return result;
    }

    let data = result;

    if (this.singleValue) {
      try {
        data = _.isArray(data) ? data.map(singleValue): singleValue(data);
      } catch (e) {
        return this.db.instance.$config.promise.reject(e);
      }
    }

    return data;
  });
};

module.exports = Executable;
