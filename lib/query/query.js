'use strict';

const _ = require('lodash');
const isPkSearch = require('./isPkSearch');
const where = require('./where');

/**
 * Represents a SELECT query.
 *
 * @class
 * @param {Object|String|Number} conditions - A criteria object, prebuilt
 * predicate, or primitive pk value.
 * @param {Object} options - Control query behavior.
 * @param {String} options.columns - SELECT list.
 * @param {Number} options.limit - LIMIT clause value.
 * @param {Number} options.offset - OFFSET clause value.
 * @param {Boolean} options.only - True to restrict query to the target table,
 * ignoring any descendant tables.
 * @param {Object} options.order - Key-value dictionary of ordering fields and
 * direction.
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
 * @param {Object} object - Database object to query.
 */
const Query = function (conditions = {}, options = {}, object = {}) {
  this.source = object.delimitedFullName;
  this.columns = options.columns || "*";
  this.only = options.only || false;
  this.orderBody = options.orderBody || false;
  this.offset = options.offset;
  this.limit = options.limit;
  this.build = options.build;
  this.document = options.document;
  this.generator = options.generator || 'generator';
  this.single = options.single || false;
  this.stream = options.stream;

  switch (options.order) {
    case null: break; // for aggregation -- need to omit ORDER BY clause entirely
    case undefined: this.order = object.hasOwnProperty('pk') && !!object.pk ? `"${object.pk}"` : '1'; break;
    default: this.order = options.order; break;
  }

  if (isPkSearch(conditions, options)) {
    if (typeof object.primaryKeyName === 'function') {
      if (_.isPlainObject(conditions)) {
        // id:val search
        this.where = where(conditions);
      } else {
        // primitive pk search
        this.where = where(_.fromPairs([[object.primaryKeyName(), conditions]]));
        this.single = true;
      }
    } else {
      // trying to query a view with a pk!
      this.where = { where : " WHERE TRUE " };
    }
  } else {
    if (conditions.hasOwnProperty('conditions')) {
      // pre-built predicates (full-text searches and Queryable.where style calls use this)
      this.where = {
        conditions: ` WHERE ${conditions.conditions} `,
        params: conditions.params
      };
    } else {
      // standard case for queryables
      this.where = where(conditions, 0, '\nWHERE ', this.generator);
    }
  }
};

/**
 * Format a full SQL statement from this Query.
 */
Query.prototype.format = function () {
  const from = this.only ? " FROM ONLY " : " FROM ";

  return "SELECT " + this.selectList() + from + this.source + this.where.conditions + this.queryOptions();
};

/**
 * Generate a SELECT list for this Query.
 */
Query.prototype.selectList = function () {
  if (_.isArray(this.columns)) {
    return this.columns.join(',');
  }

  return this.columns;
};

// TODO refactor into format
Query.prototype.queryOptions = function () {
  if (_.isArray(this.order)) {
    const orderBody = this.orderBody;

    this.order = _.reduce(this.order, function (acc, val) {
      val.direction = val.direction || "asc";

      if (orderBody) {
        val.field = `body->>'${val.field}'`;
      }

      if (val.type) {
        acc.push(`(${val.field})::${val.type} ${val.direction}`);
      } else {
        acc.push(`${val.field} ${val.direction}`);
      }

      return acc;
    }, []).join(",");
  }

  let sql = "";

  if (this.order) { sql = " order by " + this.order; }
  if (this.offset) { sql += " offset " + this.offset; }
  if (this.limit || this.single) { sql += " limit " + (this.limit || "1"); }

  return sql;
};

module.exports = Query;
