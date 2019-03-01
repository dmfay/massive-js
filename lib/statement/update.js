'use strict';

const _ = require('lodash');
const parseKey = require('../util/parse-key');
const where = require('./where');
const prepareParams = require('../util/prepare-params');

/**
 * Represents an UPDATE query.
 *
 * @class
 * @param {Table} source - Database object to query.
 * @param {Object} changes - A map of field names to new values.
 * @param {Object} criteria - A criteria object.
 * @param {Object} [options] - {@link https://massivejs.org/docs/options-objects|Update options}.
 */
const Update = function (source, changes, criteria = {}, options = {}) {
  let offset = 0;

  changes = _.pick(changes, source.columns);

  this.params = prepareParams(_.keys(changes), [changes]);
  this.changes = _.reduce(changes, (acc, value, key) => {
    acc.push(`"${key}" = $${++offset}`);

    return acc;
  }, []);

  options = _.defaults(options, {
    only: false,
    generator: 'tableGenerator',
    single: false
  });

  this.source = source;
  this.only = options.only;
  this.build = options.build;
  this.decompose = options.decompose;
  this.document = options.document;
  this.generator = options.generator;
  this.single = options.single;
  this.stream = options.stream;

  // get fields to return from options
  this.fields = options.fields ? options.fields.map(f => parseKey(f).field) : ['*'];

  if (source.isPkSearch(criteria, options)) {
    if (_.isPlainObject(criteria)) {
      // id:val search
      this.where = where(criteria, this.params.length);
    } else {
      // primitive unary pk search
      this.where = where(_.fromPairs([[source.pk[0], criteria]]), this.params.length);
      this.single = true;
    }
  } else {
    this.where = where(criteria, this.params.length, this.generator);
  }

  this.params = this.params.concat(this.where.params);
};

/**
 * Format this object into a SQL UPDATE.
 *
 * @return {String} A SQL UPDATE statement.
 */
Update.prototype.format = function () {
  let sql = 'UPDATE ';

  if (this.only) { sql += 'ONLY '; }

  sql += `${this.source.delimitedFullName} SET ${this.changes.join(', ')} WHERE ${this.where.conditions} `;

  sql += `RETURNING ${this.fields.join(', ')}`;

  return sql;
};

module.exports = Update;
