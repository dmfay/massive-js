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
 * @param {Object} [options] - Control query behavior.
 * @param {Boolean} options.only - True to restrict query to the target table,
 * ignoring any descendant tables.
 * @param {Boolean} [options.build] - True to return the SQL *instead of* running
 * it.
 * @param {Boolean} [options.document] - This is a query against a document
 * table.
 * @param {Boolean} [options.single] - True to return a single object instead of
 * an array.
 * @param {Boolean} [options.stream] - True to return a stream instead of a
 * resultset.
 */
const Delete = function (source, criteria = {}, options = {}) {
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
 */
Delete.prototype.format = function () {
  let sql = 'DELETE FROM ';

  if (this.only) { sql += 'ONLY '; }

  sql += `${this.source} WHERE ${this.where.conditions} RETURNING *`;

  return sql;
};

module.exports = Delete;
