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
 * @param {Object} args
 * @param {Object} args.db - A {@linkcode Database}.
 * @param {String} args.name - The entity's name.
 * @param {String} args.schema - Entity's owning schema.
 */
const Executable = function(args) {
  Entity.apply(this, arguments);

  this.sql = args.sql;
  this.filePath = args.filePath;
  this.singleRow = args.enhancedFunctions && args.return_single_row;
  this.singleValue = args.enhancedFunctions && args.return_single_value;
};

util.inherits(Executable, Entity);

/**
 * Invoke the function or script.
 *
 * @param {Array|...Object} [args] Function arguments or prepared statement
 * parameters.
 * @param {Object} [options] Query options.
 * instead of an array of results.
 * @param {Boolean} options.stream - True to return a stream instead of a
 * resultset.
 * @return Execution results.
 */
Executable.prototype.invoke = function() {
  const args = _.isArray(arguments[0]) || _.isPlainObject(arguments[0]) ? arguments[0] : Array.prototype.slice.call(arguments);
  let opts = {single: this.singleRow || false};

  if (!_.isArray(_.last(args)) && _.isPlainObject(_.last(args))) {
    opts = args.pop();
  }

  return this.db.query(this.sql, args, opts).then(result => {
    if (result instanceof EventEmitter && typeof result.read === "function") {
      if (this.singleValue) { result = result.pipe(SingleValueStream()); }

      return Promise.resolve(result);
    }

    let data = result;

    if (this.singleValue) {
      try {
        data = _.isArray(data) ? data.map(singleValue): singleValue(data);
      } catch (e) {
        return Promise.reject(e);
      }
    }

    return Promise.resolve(data);
  });
};

module.exports = Executable;
