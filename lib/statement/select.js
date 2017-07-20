'use strict';

const _ = require('lodash');
const where = require('./where');
const orderBy = require('./order-by');

/**
 * Represents a SELECT query.
 *
 * @class
 * @param {Queryable} source - Database object to query.
 * @param {Object|String|Number} criteria - A criteria object, prebuilt
 * predicate, or primitive pk value.
 * @param {Object} options - Control query behavior.
 * @param {Array|String} options.columns - Change the SELECT list.
 * @param {Number} options.limit - LIMIT clause value.
 * @param {Number} options.offset - OFFSET clause value.
 * @param {Boolean} options.only - True to restrict query to the target table,
 * ignoring any descendant tables.
 * @param {Object|String} options.order - Key-value dictionary of ordering
 * fields and direction, or a string containing fields and directions to be
 * interpolated directly.
 * @param {Boolean} options.orderBody - True to apply options.order to the
 * document in the table's 'body' field instead of to the table itself.
 * @param {Boolean} options.build - True to return the SQL *instead of* running
 * it.
 * @param {Boolean} options.document - This is a query against a document
 * table.
 * @param {Boolean} options.single - True to return a single object instead of
 * an array.
 * @param {Boolean} options.stream - True to return a stream instead of a
 * resultset.
 */
const Select = function (source, criteria = {}, options = {}) {
  // TODO break out select list for parity with update?
  options = _.defaults(options, {
    columns: '*',
    only: false,
    orderBody: false,
    generator: 'generator',
    single: false
  });

  if (_.isUndefined(options.order)) {
    // null indicates ORDER BY should be omitted entirely for aggregation etc
    options.order = source.hasOwnProperty('pk') && !!source.pk ? `"${source.pk}"` : '1';
  }

  this.source = source.delimitedFullName;
  this.columns = _.castArray(options.columns);
  this.only = options.only;
  this.offset = options.offset;
  this.limit = options.limit;
  this.build = options.build;
  this.document = options.document;
  this.generator = options.generator;
  this.single = options.single;
  this.stream = options.stream;
  this.order = orderBy(options.order, options.orderBody);

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
    if (criteria.hasOwnProperty('conditions')) {
      // pre-built predicates (full-text searches and Queryable.where style calls use this)
      this.where = criteria;
    } else {
      // standard case for queryables
      this.where = where(criteria, 0, this.generator);
    }
  }

  this.params = this.where.params;
};

/**
 * Format this object into a SQL SELECT.
 */
Select.prototype.format = function () {
  let sql = `SELECT ${this.columns.join(',')} FROM `;

  if (this.only) { sql += 'ONLY '; }

  sql += `${this.source} WHERE ${this.where.conditions} ${this.order}`;

  if (this.offset) { sql += ' OFFSET ' + this.offset; }
  if (this.single) { sql += ' LIMIT 1'; }
  else if (this.limit) { sql += ` LIMIT ${this.limit}`; }

  return sql;
};

module.exports = Select;
