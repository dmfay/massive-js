'use strict';

const _ = require('lodash');
const util = require('util');
const Entity = require('./entity');
const Select = require('./statement/select');
const where = require('./statement/where');

const isUuid = new RegExp(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

/**
 * A readable database entity (table or view).
 *
 * @class
 * @extends Entity
 * @param {Object} spec - An {@linkcode Entity} specification representing a
 * readable object:
 * @param {Object} spec.db - A {@linkcode Database}.
 * @param {String} spec.name - The table or view's name.
 * @param {String} spec.schema - The name of the schema owning the table or
 * view.
 * @param {Boolean} [spec.is_matview] - Whether the object is a materialized view
 * (default false).
 */
const Readable = function (spec) {
  Entity.apply(this, arguments);

  this.isMatview = spec.is_matview || false;
};

util.inherits(Readable, Entity);

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
Readable.prototype.count = function (conditions = {}, params = []) {
  if (_.isString(conditions)) {
    conditions = {
      conditions,
      params
    };
  }

  const query = new Select(this, conditions, {exprs: {count: 'COUNT(1)'}, order: null, single: true});

  return this.db.query(query).then(res => res.count);
};

/**
 * Count documents matching criteria. Unlike count, this function only supports
 * criteria objects.
 *
 * @param {Object} criteria - A criteria object.
 * @return {Promise} Number of matching documents.
 */
Readable.prototype.countDoc = function (criteria = {}) {
  const query = new Select(this, criteria, {exprs: {count: 'COUNT(1)'}, order: null, single: true, generator: 'docGenerator'});

  return this.db.query(query).then(res => res.count);
};

/**
 * Find rows matching criteria.
 *
 * @param {Object|UUID|Number} criteria - A criteria object or primary key value.
 * @param {Object} [options] - {@link https://dmfay.github.io/massive-js/options.html|Select options}.
 * @return {Promise} An array containing any query results.
 */
Readable.prototype.find = function (criteria = {}, options = {}) {
  return this.db.query(new Select(this, criteria, options));
};

/**
 * Find a document by searching in the body.
 *
 * @param {Object|UUID|Number} [criteria] - A criteria object or primary key value.
 * @param {Object} [options] - {@link https://dmfay.github.io/massive-js/options.html|Select options}.
 * @return {Promise} An array containing any query results.
 */
Readable.prototype.findDoc = function (criteria = {}, options = {}) {
  options.document = true;
  options.generator = 'docGenerator';

  return this.find(criteria, options);
};

/**
 * Return a single record.
 *
 * @param {Object|UUID|Number} criteria - A criteria object or primary key value.
 * @param {Object} [options] - {@link https://dmfay.github.io/massive-js/options.html|Select options}.
 * @return {Promise} An object representing the (first) record found, or
 * null if no records match.
 */
Readable.prototype.findOne = function () {
  const opts = arguments[1] || {};

  opts.single = true;

  return this.find(arguments[0], opts);
};

/**
 * Refresh a materialized view.
 *
 * @param {Boolean} [concurrently] - Do it without locking reads.
 * @return {Promise} A query with no results.
 */
Readable.prototype.refresh = function (concurrently) {
  if (!this.isMatview) {
    return this.db.$p.reject(new Error(`${this.delimitedName} is not a materialized view`));
  }

  const concurrentlyStr = concurrently ? 'CONCURRENTLY' : '';

  return this.db.query(`REFRESH MATERIALIZED VIEW ${concurrentlyStr} ${this.delimitedName}`);
};

/**
 * Determine whether criteria represent a search by primary key. If a number or
 * uuid are passed, it is assumed to be a primary key value; if an object, it
 * must have only one key, which must specify the primary key column.
 *
 * @param {Object|String|Number} criteria - A criteria object or primitive to
 * test.
 * @return {Boolean} True if the criteria represent a primary key search.
 */
Readable.prototype.isPkSearch = function (criteria) {
  // disqualify non-tables and foreign tables
  if (!this.pk) { return false; }

  if (_.isNumber(criteria) || (_.isString(criteria) && isUuid.test(criteria))) {
    // primitive value
    return true;
  } else if (_.isPlainObject(criteria)) {
    const criteriaKeys = Object.keys(criteria);

    return this.pk.every(keyColumn => {
      if (Object.prototype.hasOwnProperty.call(criteria, keyColumn)) { return true; }

      return criteriaKeys.some(k => new RegExp(`^${keyColumn}[^\\w\\d]?`).test(k));
    });
  }

  return false;
};

/**
 * Perform a full-text search on queryable fields. If options.document is true,
 * looks in the document body fields instead of the table columns.
 *
 * @param {Object} plan - Search definition.
 * @param {Array} plan.fields - List of the fields to search.
 * @param {String} plan.term - Search term.
 * @param {Object} [options] - {@link https://dmfay.github.io/massive-js/options.html|Select options}.
 * @return {Promise} An array containing any query results.
 */
Readable.prototype.search = function (plan, options = {}) {
  if (!plan.fields || !plan.term) {
    return this.db.instance.$config.promise.reject('Need fields as an array and a term string');
  }

  const params = [plan.term];
  let tsv;

  if (plan.fields.length === 1) {
    tsv = plan.fields[0];
    if (tsv.indexOf('>>') === -1) {
      tsv = `"${tsv}"`; // just a column, quote it to preserve casing
    }
  } else {
    tsv = `concat(${plan.fields.join(", ' ', ")})`;  // eslint-disable-line quotes
  }

  const criteria = {
    conditions: `to_tsvector(${tsv}) @@ to_tsquery($1)`,
    params
  };

  if (plan.where) {
    const searchWhere = where(plan.where);

    criteria.conditions += ` AND ${searchWhere.conditions}`;
    criteria.params = criteria.params.concat(searchWhere.params);
  }

  const query = new Select(this, criteria, options);

  return this.db.query(query);
};

/**
 * Shortcut to perform a full text search on a document table.
 *
 * @param {Object} plan - Search definition.
 * @param {Array} [plan.fields] - List of the document keys to search.
 * @param {String} plan.term - Search term.
 * @param {Object} [options] - {@link https://dmfay.github.io/massive-js/options.html|Select options}.
 * @return {Promise} An array containing any query results.
 */
Readable.prototype.searchDoc = function (plan, options = {}) {
  if (!plan.term) {
    return this.db.instance.$config.promise.reject('Need fields as an array and a term string');
  }

  options.document = true;

  let tsv;

  // TODO 'where' functionality might be better at processing search params for JSON etc
  if (!plan.fields) {
    tsv = 'search';
  } else if (plan.fields.length === 1) {
    tsv = `to_tsvector(body ->> '${plan.fields[0]}')`;
  } else {
    const formattedKeys = plan.fields.map(key => {
      return `(body ->> '${key}')`;
    });

    tsv = `to_tsvector(concat(${formattedKeys.join(", ' ',")}))`;  // eslint-disable-line quotes
  }

  const criteria = {
    conditions: `${tsv} @@ to_tsquery($1)`,
    params: [plan.term]
  };

  if (plan.where) {
    const searchWhere = where(plan.where, 1, options.document ? 'docGenerator' : 'tableGenerator');

    criteria.conditions += ` AND ${searchWhere.conditions}`;
    criteria.params = criteria.params.concat(searchWhere.params);
  }

  const query = new Select(this, criteria, options);

  return this.db.query(query);
};

/**
 * Run a query with a raw SQL predicate, eg:
 *
 * db.mytable.where('id=$1', [123]).then(...);
 *
 * @param {String} conditions - A raw SQL predicate.
 * @param {Array} [params] - Prepared statement parameters.
 * @param {Object} [options] - {@link https://dmfay.github.io/massive-js/options.html|Select options}.
 * @return {Promise} An array containing any query results.
 */
Readable.prototype.where = function (conditions, params = [], options) {
  if (!_.isArray(params) && !_.isPlainObject(params)) { params = [params]; }

  const query = new Select(this, {conditions, params}, options);

  return this.db.query(query);
};

module.exports = Readable;
