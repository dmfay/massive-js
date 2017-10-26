'use strict';

const _ = require('lodash');
const parseKey = require('../util/parse-key');
const where = require('./where');
const orderBy = require('./order-by');

/**
 * Represents a SELECT query.
 *
 * @class
 * @param {Queryable} source - Database object to query.
 * @param {Object|String|UUID|Number} criteria - A criteria object, prebuilt
 * predicate, or primitive pk value.
 * @param {Object} [options] - {@link https://dmfay.github.io/massive-js/options.html|Select options}.
 */
const Select = function (source, criteria = {}, options = {}) {
  options = _.defaults(options, {
    exprs: [],
    only: false,
    orderBody: false,
    generator: 'tableGenerator',
    single: false
  });

  if (_.isUndefined(options.order)) {
    // null indicates ORDER BY should be omitted entirely for aggregation etc
    options.order = source.hasOwnProperty('pk') && !!source.pk ? `"${source.pk}"` : '1';
  }

  this.source = source.delimitedFullName;
  this.only = options.only;
  this.offset = options.offset;
  this.limit = options.limit;
  this.build = options.build;
  this.document = options.document;
  this.decompose = options.decompose;
  this.generator = options.generator;
  this.single = options.single;
  this.stream = options.stream;
  this.order = orderBy(options.order, options.orderBody);

  if (options.columns) {
    this.fields = _.castArray(options.columns);  // TODO deprecated, remove me in v5
  } else {
    this.fields = [];
  }

  _.castArray(options.fields || []).forEach((f) => {
    if (options.document) {
      this.fields.push(parseKey(`body.${f}`).field);
    }

    this.fields.push(parseKey(f).field);
  });

  _.forEach(options.exprs, (expr, name) => {
    this.fields.push(`${expr} AS ${name}`);
  });

  if (this.fields.length === 0) {
    this.fields = ['*'];
  }

  if (source.isPkSearch(criteria, options)) {
    if (_.isPlainObject(criteria)) {
      // id:val search
      this.where = where(criteria);
    } else {
      // primitive pk search
      this.where = where(_.fromPairs([[source.pk, criteria]]));
      this.single = true;
    }
  } else if (criteria.hasOwnProperty('conditions')) {
    // pre-built predicates (full-text searches and Queryable.where style calls use this)
    this.where = criteria;
  } else {
    // standard case for queryables
    this.where = where(criteria, 0, this.generator);
  }

  this.params = this.where.params;
};

/**
 * Format this object into a SQL SELECT.
 *
 * @return {String} A SQL SELECT statement.
 */
Select.prototype.format = function () {
  let sql = `SELECT ${this.fields.join(',')} FROM `;

  if (this.only) { sql += 'ONLY '; }

  sql += `${this.source} WHERE ${this.where.conditions} ${this.order}`;

  if (this.offset) { sql += ' OFFSET ' + this.offset; }
  if (this.single) {
    sql += ' LIMIT 1';
  } else if (this.limit) {
    sql += ` LIMIT ${this.limit}`;
  }

  return sql;
};

module.exports = Select;
