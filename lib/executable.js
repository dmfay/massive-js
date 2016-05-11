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


// invoke with:
//   db.function(opts, callback)
//   db.function([arg1, arg2, ...], opts, callback)
//   db.function(arg1, arg2, ..., opts, callback)
//
//  where opts is optional and can be left out
//        args must be scalar types (no arrays or objects)

Executable.prototype.invoke = function() {

  var args = Array.prototype.slice.call(arguments);
  var next = args.pop();
  var opts = {};
  var params = [];

  if (!_.isFunction(next)) {
    throw "Function or Script Execution expects a next function as the last argument";
  }

  if (!_.isArray(_.last(args)) && _.isObject(_.last(args))) {
    opts = args.pop();
  }

  if (_.isArray(args[0])) {          // backwards compatible -- db.function([...], ?opts, callback)
    params = args[0];
  } else {
    params = args;
  }

  // console.log("invoke next: ", next);
  // console.log("invoke opts: ", opts);
  // console.log("invoke params: ", params);

  if (opts.stream) {
    this.db.stream(this.sql, params, null, next);
  } else {
    this.db.query(this.sql, params, null, next);
  }
};

module.exports = Executable;
