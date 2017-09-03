'use strict';

const _ = require('lodash');
const where = require('./where');

/**
 * Represents a DELETE query.
 *
 * @class
 * @param {Table} source - Database object to query.
 * @param {Object|String|Number} [criteria] - A criteria object or primitive pk
 * value.
 * @param {Object} [options] - {@link https://dmfay.github.io/massive-js/options.html|Delete options}.
 */
const Delete = function (source, criteria = {}, options = {}) {
  options = _.defaults(options, {
    only: false,
    generator: 'tableGenerator',
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
    if (_.isPlainObject(criteria)) {
      // id:val search
      this.where = where(criteria);
    } else {
      // primitive pk search
      this.where = where(_.fromPairs([[source.pk, criteria]]));
      this.single = true;
    }
  } else {
    this.where = where(criteria, 0, this.generator);
  }

  this.params = this.where.params;
};

/**
 * Format this object into a SQL DELETE.
 *
 * @return {String} A SQL DELETE statement.
 */
Delete.prototype.format = function () {
  let sql = 'DELETE FROM ';

  if (this.only) { sql += 'ONLY '; }

  sql += `${this.source} WHERE ${this.where.conditions} RETURNING *`;

  return sql;
};

module.exports = Delete;
