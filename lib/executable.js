'use strict';

const _ = require('lodash');
const util = require('util');
const Entity = require('./entity');
const Transform = require('stream').Transform;
const EventEmitter = require('events');
const inherits = require('util').inherits;

/**
 * Returns the value of a single-key object.
 */
function _processSingleValue(data) {
  if (!_.isNull(data)) {
    const keys = Object.keys(data);
    if (keys.length != 1) {
      throw new Error("Was expecting just one value");
    }
    data = data[keys[0]];
  }
  return data;
}

/**
 * A stream which processes single-key results objects into their values for
 * convenience on the client side.
 */
// TODO extract
function SingleValueStream(options) {
  if (!(this instanceof SingleValueStream)) {
    return new SingleValueStream(options);
  }
  if (!options) {
    options = {};
  }
  options.objectMode = true;
  Transform.call(this, options);
}

inherits(SingleValueStream, Transform);

SingleValueStream.prototype._transform = function _transform(obj, encoding, callback) {
  try {
    obj = _processSingleValue(obj);
  } catch(err) {
    return callback(err);
  }
  this.push(obj);
  callback();
};

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
 * @param {Boolean} options.single - True to return a single result object
 * instead of an array of results.
 * @param {Boolean} options.stream - True to return a stream instead of a
 * resultset.
 * @return Execution results.
 */
Executable.prototype.invoke = function() {
  const args = _.isArray(arguments[0]) ? arguments[0] : Array.prototype.slice.call(arguments);
  let opts = {single: this.singleRow || false};

  if (!_.isArray(_.last(args)) && _.isObject(_.last(args))) {
    opts = args.pop();
  }

  return this.db.query(this.sql, args, opts).then(result => {
    if (result instanceof EventEmitter && typeof result.read === "function") {
      if (this.singleValue) { result = result.pipe(SingleValueStream()); }

      return Promise.resolve(result);
    }

    let data = result;

    try {
      if (this.singleValue) {
        data = _.isArray(data) ? data.map(_processSingleValue): _processSingleValue(data);
      }
    } catch (e) {
      return Promise.reject(e);
    }

    return Promise.resolve(data);
  });
};

module.exports = Executable;
