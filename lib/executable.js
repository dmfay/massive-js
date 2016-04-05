'use strict';


function Executable(opts) {
  this._runner = opts.runner;

  this._sql = opts.sql;
}


Executable.prototype = {
  invoke: function(params, opts) {
    opts = opts || {};

    if (opts.stream) {
      return this._runner.stream(this._sql, params);
    } else {
      return this._runner.query(this._sql, params);
    }
  }
};

module.exports = createExecutable;

function createExecutable(opts) {
  var exec = new Executable(opts);

  return function(params, opts) {
    return exec.invoke(params, opts);
  };
}
