'use strict';

const util = require('util');
const Entity = require('./entity');
const Select = require('./statement/select');

/**
 * A database sequence.
 *
 * @class
 * @extends Entity
 * @param {Object} spec - An {@linkcode Entity} specification representing a
 * sequence object:
 * @param {Object} spec.db - A {@linkcode Database}.
 * @param {String} spec.name - The sequence's name.
 * @param {String} spec.schema - The name of the schema owning the sequence.
 */
const Sequence = function () {
  Entity.apply(this, arguments);
};

util.inherits(Sequence, Entity);

/**
 * Get the last value the sequence returned.
 *
 * @return {Promise} The last sequence value.
 */
Sequence.prototype.lastValue = function () {
  return this.db.query(new Select(this, {}, {fields: ['last_value'], single: true})).then(v => v.last_value);
};

/**
 * Increment the sequence counter and return the next value.
 *
 * @return {Promise} The next sequence value.
 */
Sequence.prototype.nextValue = function () {
  return this.db.query(`SELECT nextval('${this.delimitedFullName}')`).then(v => v[0].nextval);
};

/**
 * Reset the sequence.
 *
 * @return {Promise} Nothing.
 * @param {Number} [initialValue] - The new value with which to seed the
 * sequence (default 1).
 */
Sequence.prototype.reset = function (initialValue = 1) {
  return this.db.query(`ALTER SEQUENCE ${this.delimitedFullName} RESTART WITH $1`, [initialValue]);
};

module.exports = Sequence;
