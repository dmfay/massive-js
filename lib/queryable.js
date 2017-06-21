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

  return this.db.query(query).then(res => res.count);
};

/**
 * Count documents matching criteria. Unlike count, this function only supports
 * criteria objects.
 *
 * @param {Object} - A criteria object.
 * @return {Promise} Number of matching documents.
 */
Queryable.prototype.countDoc = function (conditions = {}) {
  const query = new Query(conditions, {columns: "COUNT(1)", order: null, single: true, generator: 'docGenerator'}, this);

  return this.db.query(query).then(res => res.count);
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
 * Find a document by searching in the body.
 *
 * @param {Object|String} [conditions] - A criteria object, prebuilt predicate,
 * or raw ID value.
 * @param {Object} [options] - Query options.
 * @return {Promise} Query results.
 */
Queryable.prototype.findDoc = function(conditions = {}, options = {}) {
  options.document = true;
  options.generator = 'docGenerator';

  return this.find(conditions, options);
};

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
    if (!results || results.length === 0) { return undefined; }
    if (results.length > 0) { return results[0]; }

    return results;
  });
};

/**
 * Perform a full-text search on queryable fields. If options.document is true,
 * looks in the document body fields instead of the table columns.
 *
 * @param {Object} plan - Search definition.
 * @param {Array} plan.fields - List of the fields to search.
 * @param {String} plan.term - Search term.
 * @param {Object} options - Query options.
 */
Queryable.prototype.search = function(plan = {}, options = {}) {
  assert(plan.fields && plan.term, "Need fields as an array and a term string");

  let params = [plan.term], tsv;

  if (!_.isArray(plan.fields)) { plan.fields = [plan.fields]; }

  // TODO 'where' functionality might be better at processing search params for JSON etc
  if (options.document) {
    if (plan.fields.length === 1) {
      tsv = `(body ->> '${plan.fields[0]}')`;
    } else {
      const formattedKeys = [];
      _.each(plan.fields, function(key){
        formattedKeys.push(`(body ->> '${key}')`);
      });
      tsv = `concat(${formattedKeys.join(", ' ',")})`;
    }
  } else {
    if (plan.fields.length === 1) {
      tsv = plan.fields[0];
      if (tsv.indexOf('>>') === -1) {
        tsv = `"${tsv}"`; // just a column, quote it to preserve casing
      }
    } else {
      tsv = `concat(${plan.fields.join(", ' ', ")})`;
    }
  }

  const criteria = where(plan.where, 1, ' AND ', options.document ? 'docGenerator' : 'generator');
  const conditions = {
    conditions: `to_tsvector(${tsv}) @@ to_tsquery($1) ${criteria.conditions}`,
    params: params.concat(criteria.params)
  };

  const query = new Query(conditions, options, this);

  return this.db.query(query);
};

/**
 * Shortcut to perform a full text search on a document table.
 *
 * @param {Object} plan - Search definition.
 * @param {Array} plan.fields - List of the document keys to search.
 * @param {String} plan.term - Search term.
 * @param {Object} options - Query options.
 */
Queryable.prototype.searchDoc = function(plan = {}, options = {}) {
  options.document = true;

  return this.search(plan, options);
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
  if (!_.isArray(params) && !_.isPlainObject(params)) { params = [params]; }

  const query = new Query({conditions: conditions, params: params}, {}, this);

  return this.db.query(query);
};

module.exports = Queryable;
