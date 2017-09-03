'use strict';

const _ = require('lodash');
const assert = require('assert');
const util = require('util');
const Entity = require('./entity');
const Select = require('./statement/select');
const where = require('./statement/where');

const isUuid = new RegExp(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

/**
 * A queryable database entity (table or view).
 *
 * @class
 * @extends Entity
 * @param {Object} spec - An {@linkcode Entity} specification representing a queryable:
 * @param {Object} spec.db - A {@linkcode Database}.
 * @param {String} spec.name - The table or view's name.
 * @param {String} spec.schema - The name of the schema owning the table or
 * view.
 */
const Queryable = function () {
  Entity.apply(this, arguments);

  // create delimited names now instead of at query time
  this.delimitedName = '"' + this.name + '"';
  this.delimitedSchema = '"' + this.schema + '"';

  // handle naming when schema is other than default:
  if (this.schema !== this.db.currentSchema) {
    this.fullname = this.schema + '.' + this.name;
    this.delimitedFullName = this.delimitedSchema + '.' + this.delimitedName;
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
Queryable.prototype.count = function (conditions = {}, params = []) {
  // TODO crappy hack for where/find signature switching, fix me
  if (_.isString(conditions)) {
    conditions = {
      conditions,
      params
    };
  }

  const query = new Select(this, conditions, {columns: 'COUNT(1)', order: null, single: true});

  return this.db.query(query).then(res => res.count);
};

/**
 * Count documents matching criteria. Unlike count, this function only supports
 * criteria objects.
 *
 * @param {Object} criteria - A criteria object.
 * @return {Promise} Number of matching documents.
 */
Queryable.prototype.countDoc = function (criteria = {}) {
  const query = new Select(this, criteria, {columns: 'COUNT(1)', order: null, single: true, generator: 'docGenerator'});

  return this.db.query(query).then(res => res.count);
};

/**
 * Find rows matching criteria.
 *
 * @param {Object|UUID|Number} criteria - A criteria object or primary key value.
 * @param {Object} [options] - {@link https://dmfay.github.io/massive-js/options.html|Select options}.
 * @return {Promise} An array containing any query results.
 */
Queryable.prototype.find = function (criteria = {}, options = {}) {
  return this.db.query(new Select(this, criteria, options));
};

/**
 * Find a document by searching in the body.
 *
 * @param {Object|UUID|Number} [criteria] - A criteria object or primary key value.
 * @param {Object} [options] - {@link https://dmfay.github.io/massive-js/options.html|Select options}.
 * @return {Promise} An array containing any query results.
 */
Queryable.prototype.findDoc = function (criteria = {}, options = {}) {
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
Queryable.prototype.findOne = function () {
  return this.find.apply(this, arguments).then(results => {
    if (!results || results.length === 0) { return null; }
    if (results.length > 0) { return results[0]; }

    return results;
  });
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
Queryable.prototype.isPkSearch = function (criteria) {
  if (!this.hasOwnProperty('pk')) { return false; }

  if (_.isNumber(criteria) || (_.isString(criteria) && isUuid.test(criteria))) {
    // primitive value
    return true;
  }

  const keys = _.keys(criteria);

  return keys.length === 1 && this.pkRegexp.test(keys[0]);
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
Queryable.prototype.search = function (plan, options = {}) {
  assert(plan.fields && plan.term, 'Need fields as an array and a term string');

  const params = [plan.term];
  let tsv;

  // TODO 'where' functionality might be better at processing search params for JSON etc
  if (options.document) {
    if (plan.fields.length === 1) {
      tsv = `(body ->> '${plan.fields[0]}')`;
    } else {
      const formattedKeys = [];
      _.each(plan.fields, function (key) {
        formattedKeys.push(`(body ->> '${key}')`);
      });
      tsv = `concat(${formattedKeys.join(", ' ',")})`;  // eslint-disable-line quotes
    }
  } else if (plan.fields.length === 1) {
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
    const searchWhere = where(plan.where, 1, options.document ? 'docGenerator' : 'tableGenerator');

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
 * @param {Array} plan.fields - List of the document keys to search.
 * @param {String} plan.term - Search term.
 * @param {Object} [options] - {@link https://dmfay.github.io/massive-js/options.html|Select options}.
 * @return {Promise} An array containing any query results.
 */
Queryable.prototype.searchDoc = function (plan, options = {}) {
  options.document = true;

  return this.search(plan, options);
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
Queryable.prototype.where = function (conditions, params = [], options) {
  if (!_.isArray(params) && !_.isPlainObject(params)) { params = [params]; }

  const query = new Select(this, {conditions, params}, options);

  return this.db.query(query);
};

module.exports = Queryable;
