'use strict';
const _ = require("underscore")._;
const util = require('util');
const Entity = require('./entity');
const Transform = require('stream').Transform;
const EventEmitter = require('events');
const inherits = require('util').inherits;

// Takes a single-key object like {"foo": 27} and just returns the 27 part
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
 */
const Executable = function(args) {
  Entity.apply(this, arguments);

  this.sql = args.sql;
  this.filePath = args.filePath;
  this.singleRow = args.singleRow;
  this.singleValue = args.singleValue;
};

util.inherits(Executable, Entity);

// invoke with:
//   db.function(opts, callback)
//   db.function([arg1, arg2, ...], opts, callback)
//   db.function(arg1, arg2, ..., opts, callback)
//
//  where opts is optional and can be left out
//        args must be scalar types (no arrays or objects)

Executable.prototype.invoke = function() {
  const args = _.isArray(arguments[0]) ? arguments[0] : Array.prototype.slice.call(arguments);
  let opts = {};

  if (!_.isArray(_.last(args)) && _.isObject(_.last(args))) {
    opts = args.pop();
  }

  const singleRow = this.singleRow && !opts.stream;
  const singleValue = this.singleValue;

  return this.db.query(this.sql, args, opts).then(result => {
    if (result instanceof EventEmitter && typeof result.read === "function") {
      if (singleValue) { result = result.pipe(SingleValueStream()); }

      return Promise.resolve(result);
    }

    let data = result;

    try {
      if (singleRow) {
        if (!Array.isArray(data)) {
          throw new Error("Was expecting an array");
        }

        data = data[0] || null;

        if (singleValue) {
          data = _processSingleValue(data);
        }
      } else {
        if (singleValue) {
          data = data.map(_processSingleValue);
        }
      }
    } catch (e) {
      return Promise.reject(e);
    }

    return Promise.resolve(data);
  });
};

module.exports = Executable;
