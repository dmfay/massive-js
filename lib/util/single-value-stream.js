'use strict';

const util = require('util');
const singleValue = require('./single-value');
const Transform = require('stream').Transform;

/**
 * A stream which processes single-key results objects into their values for
 * convenience on the client side.
 *
 * @class
 * @param {Object} options - Stream options.
 */
function SingleValueStream() {
  if (!(this instanceof SingleValueStream)) {
    return new SingleValueStream();
  }

  Transform.call(this, {objectMode: true});
}

util.inherits(SingleValueStream, Transform);

SingleValueStream.prototype._transform = function _transform(obj, encoding, callback) {
  try {
    this.push(singleValue(obj));
  } catch(err) {
    return callback(err);
  }

  callback();
};

exports = module.exports = SingleValueStream;
