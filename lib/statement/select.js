'use strict';

const _ = require('lodash');
const parseKey = require('../util/parse-key');
const where = require('./where');
const orderBy = require('./order-by');

/**
 * Represents a SELECT query.
 *
 * @class
 * @param {Readable} source - Database object to query.
 * @param {Object|String|UUID|Number} criteria - A criteria object, prebuilt
 * predicate, or primitive pk value.
 * @param {Object} [options] - {@link https://dmfay.github.io/massive-js/options.html|Select options}.
 */
const Select = function (source, criteria = {}, options = {}) {
  options = _.defaults(options, {
    only: false,
    orderBody: false,
    generator: 'tableGenerator',
    single: false
  });

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

  switch (options.order) {
    case null:
      // null options.order indicates ORDER BY should be omitted entirely for
      // aggregation etc
      this.order = '';
      break;
    case undefined:
      this.order = source.pk ? `ORDER BY "${source.pk.join('", "')}"` : 'ORDER BY 1';
      break;
    default:
      this.order = orderBy(options.order, options.orderBody);
      break;
  }

  this.fields = [];

  // add user-defined fields
  this.fields = _.castArray(options.fields || []).reduce((all, field) => {
    if (options.document) {
      // document fields need to be aliased
      all.push({
        value: parseKey(`body.${field}`).field,
        alias: field
      });
    } else {
      all.push(parseKey(field).field);
    }

    return all;
  }, this.fields);

  // interpolate unsafe user-defined expressions
  _.forEach(options.exprs || [], (expr, name) => {
    this.fields.push({
      value: expr,
      alias: name
    });
  });

  if (!this.fields.length) {
    if (!options.fields && !options.exprs) {
      // nothing specified, select all
      this.fields.push('*');
    } else {
      // explicit empty array, error state
      this.error = 'The fields array cannot be empty';
    }
  } else if (options.document) {
    // if the user *did* specify something, but we're querying a document table
    // and so require the id field in addition to whatever they're after
    this.fields.push('id');
  }

  if (Object.prototype.hasOwnProperty.call(criteria, 'conditions') && Object.prototype.hasOwnProperty.call(criteria, 'params')) {
    // pre-built predicates (full-text searches and Readable.where style calls use this)
    this.where = criteria;
  } else if (source.isPkSearch(criteria)) {
    if (_.isPlainObject(criteria)) {
      // id:val search
      this.where = where(criteria);
    } else {
      // primitive unary pk search
      this.where = where(_.fromPairs([[source.pk[0], criteria]]));
      this.single = true;
    }
  } else {
    // standard case for Readables
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
  if (this.error) {
    throw new Error(this.error);
  }

  const selectList = this.fields.map(f => {
    if (_.isPlainObject(f)) {
      // aliased definitions for document fields
      return `${f.value} AS "${f.alias}"`;
    }

    return f;
  });

  let sql = `SELECT ${selectList.join(',')} FROM `;

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
