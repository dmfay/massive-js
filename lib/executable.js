var _ = require("underscore")._;
var util = require('util');
var Entity = require('./entity');

/**
 * An executable function or script.
 */
var Executable = function(args) {
  Entity.apply(this, arguments);

  this.sql = args.sql;
  this.filePath = args.filePath;
};

util.inherits(Executable, Entity);

Executable.prototype.invoke = function(params, opts, next) {
  if (_.isFunction(params)) {       // invoked as db.function(callback)
    next = params;
    params = [];
    opts = {};
  } else if (_.isFunction(opts)) {  // invoked as db.function(something, callback)
    next = opts;

    // figure out if we were given params or opts as the first argument
    // lucky for us it's mutually exclusive: opts can only be an object, params can be a primitive or an array
    if (_.isObject(params) && !_.isArray(params)) { // it's an options object, we have no params
      opts = params;
      params = [];
    } else {                                        // it's a parameter primitive or array, we have no opts
      opts = {};
    }
  }

  if (!_.isArray(params)) {
    params = [params];
  }

  if (opts.stream) {
    this.db.stream(this.sql, params, null, next);
  } else {
    this.db.query(this.sql, params, null, next);
  }
};

module.exports = Executable;
