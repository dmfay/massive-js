'use strict';

const _ = require('lodash');
const where = require('./where');

/**
 * Represents an UPDATE query.
 *
 * @class
 * @param {Table} source - Database object to query.
 * @param {Object|String|Number} criteria - A criteria object, prebuilt
 * predicate, or primitive pk value.
 * @param {Object} changes - A map of field names to new values.
 * @param {Object} [options] - {@link https://dmfay.github.io/massive-js/options.html|Update options}.
 */
const Update = function (source, changes, criteria = {}, options = {}) {
  let offset = 0;

  this.params = [];
  this.changes = _.reduce(changes, (acc, value, key) => {
    this.params.push(value);
    acc.push(`"${key}" = $${++offset}`);

    return acc;
  }, []);

  options = _.defaults(options, {
    only: false,
    generator: 'generator',
    single: false
  });

  this.source = source.delimitedFullName;
  this.only = options.only;
  this.build = options.build;
  this.document = options.document;
  this.generator = options.generator;
  this.single = options.single;
  this.stream = options.stream;

  if (source.isPkSearch(criteria, options)) {
    // update doesn't support primitive searches, but this ensures that
    // document pk searches use the standard generator
    this.where = where(criteria, this.params.length);
  } else {
    this.where = where(criteria, this.params.length, this.generator);
  }

  this.params = this.params.concat(this.where.params);
};

/**
 * Format this object into a SQL UPDATE.
 */
Update.prototype.format = function () {
  let sql = 'UPDATE ';

  if (this.only) { sql += 'ONLY '; }

  sql += `${this.source} SET ${this.changes.join(', ')} WHERE ${this.where.conditions} RETURNING *`;

  return sql;
};

module.exports = Update;
