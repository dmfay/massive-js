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

  var args = Array.prototype.slice.call(arguments);
  var next = args.pop();
  var opts = {};
  var params = [];

  if (!_.isFunction(next)) {
    throw "Function or Script Execution expects a next function as the last argument";
  }

  if (opts.stream && (this.singleRow || this.singleValue)) {
    throw new Error("Streaming singleRow/singleValue is not supported");
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

  function _processSingleValue(data) {
    if (singleValue && !_.isNull(data)) {
      var keys = Object.keys(data);
      if (keys.length != 1) {
        throw new Error("Was expecting just one value");
      }
      data = data[keys[0]];
    }
    return data;
  }

  if (opts.stream) {
    this.db.stream(this.sql, params, null, next);
  } else {
    var singleRow = this.singleRow, singleValue = this.singleValue;
    this.db.query(this.sql, params, null, function (err, rawData) {
      var data = rawData;
      if (err) return next(err);
      try {
        if (singleRow) {
          if (!Array.isArray(data)) {
            return next(new Error("Was expecting an array"));
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
        err = e;
      }
      return next(err, data);
    });
  }
};

module.exports = Executable;
