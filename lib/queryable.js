'use strict';

const _ = require('lodash');
const assert = require('assert');
const util = require('util');
const Entity = require('./entity');
const Query = require('./query/query');
const where = require('./query/where');

/**
 * A queryable database entity (table or view).
 *
 * @class
 * @param {Object} args
 * @param {Object} args.db - A {@linkcode Database}.
 * @param {String} args.name - The entity's name.
 * @param {String} args.schema - Entity's owning schema.
 */
const Queryable = function() {
  Entity.apply(this, arguments);

  // create delimited names now instead of at query time
  this.delimitedName = "\"" + this.name + "\"";
  this.delimitedSchema = "\"" + this.schema + "\"";

  // handle naming when schema is other than public:
  if(this.schema !== "public") {
    this.fullname = this.schema + "." + this.name;
    this.delimitedFullName = this.delimitedSchema + "." + this.delimitedName;
  } else {
    this.fullname = this.name;
    this.delimitedFullName = this.delimitedName;
  }
};

util.inherits(Queryable, Entity);

/**
 * Return a single record.
 *
 * @param {Object} conditions - A criteria object.
 * @param {Object} [options] - Query options.
 * @return {Promise} An object representing the (first) record found, or
 * undefined if no records match.
 */
Queryable.prototype.findOne = function () {
  return this.find.apply(this, arguments).then(results => {
    if (results.length === 0) { return undefined; }
    if (results.length > 0) { return Promise.resolve(results[0]); }

    return Promise.resolve(results);
  });
};

/**
 * Count rows matching criteria. There are two ways to use this method:
 *
 * 1. find() style: db.mytable.count({field: value});
 * 2. where() style: db.mytable.count("field=$1", [value]);
 *
 * @param {Object|String} conditions - A criteria object or SQL predicate.
 * @param {Array} params - Prepared statement parameters for use with raw SQL
 * predicates.
 * @return {Promise} Row count.
 */
Queryable.prototype.count = function(conditions = {}, params = []) {
  // TODO crappy hack for where/find signature switching, fix me
  if (_.isString(conditions)) {
    conditions = {
      conditions: conditions,
      params: params
    };
  }

  const query = new Query(conditions, {columns: "COUNT(1)", order: null, single: true}, this);

  return this.db.query(query).then(res => Promise.resolve(res.count));
};

/**
 * Run a query with a raw SQL predicate, eg:
 *
 * db.mytable.where('id=$1', [123]).then(...);
 *
 * @param {String} conditions - A raw SQL predicate.
 * @param {Array} params - Prepared statement parameters.
 * @return {Promise} Query results.
 */
Queryable.prototype.where = function(conditions = "true", params = []) {
  if (!_.isArray(params)) { params = [params]; }

  const query = new Query({conditions: conditions, params: params}, {}, this);

  return this.db.query(query);
};

/**
 * Find rows matching criteria.
 *
 * @param {Object|String} [conditions] - A criteria object, prebuilt predicate,
 * or raw primary key value.
 * @param {Object} [options] - Query options.
 * @return {Promise} Query results.
 */
Queryable.prototype.find = function(conditions = {}, options = {}) {
  if (conditions === '*') { conditions = {}; }

  return this.db.query(new Query(conditions, options, this));
};

/**
 * Perform a full-text search on queryable columns.
 *
 * @param {Object} fields - Search definition.
 * @param {Array} fields.columns - List of the columns to search.
 * @param {String} fields.term - Search term.
 * @param {Object} options - Query options.
 */
Queryable.prototype.search = function(fields = {}, options = {}) {
  //search expects a columns array and the term
  assert(fields.columns && fields.term, "Need columns as an array and a term string");

  let params = [fields.term], tsv;

  if (!_.isArray(fields.columns)) { fields.columns = [fields.columns]; }

  // TODO 'where' functionality might be better at processing search params for JSON etc
  if (fields.columns.length === 1) {
    tsv = fields.columns[0];
    if (tsv.indexOf('>>') === -1) {
      tsv = `"${tsv}"`; // just a column, quote it to preserve casing
    }
  } else {
    tsv = `concat(${fields.columns.join(", ' ', ")})`;
  }

  const criteria = where(fields.where, 1, ' AND ');
  const conditions = {
    conditions: `to_tsvector(${tsv}) @@ to_tsquery($1) ${criteria.conditions}`,
    params: params.concat(criteria.params)
  };

  const query = new Query(conditions, options, this);

  return this.db.query(query);
};

module.exports = Queryable;
