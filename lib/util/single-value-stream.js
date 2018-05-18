'use strict';

const _ = require('lodash');
const util = require('util');
const Transform = require('stream').Transform;

/**
 * A stream which processes single-key results objects into their values for
 * convenience on the client side.
 *
 * @class
 * @param {Object} options - Stream options.
 */
function SingleValueStream () {
  Transform.call(this, {objectMode: true});
}

util.inherits(SingleValueStream, Transform);

/**
 * Converts a single-key object into its value.
 *
 * @param {Object} obj - A JavaScript object.
 * @return {Any} The scalar value of the object's only key.
 */
SingleValueStream.singleValue = obj => {
  const values = _.values(obj);

  if (values.length !== 1) {
    throw new Error('cannot pull single value from a multi-valued object');
  }

  return values[0];
};

/**
 * Implement the Transform stream that invokes singleValue on everything which
 * passes through it.
 *
 * @param {Object} obj - The current item being transformed.
 * @param {String} encoding - Unused with objectMode.
 * @param {Function} callback - Callback on completion of the singleValue transformation.
 * @return {void}
 */
SingleValueStream.prototype._transform = function _transform (obj, encoding, callback) {
  try {
    this.push(SingleValueStream.singleValue(obj));
  } catch (err) {
    return callback(err);
  }

  return callback();
};

exports = module.exports = SingleValueStream;
