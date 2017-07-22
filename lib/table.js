'use strict';

const _ = require('lodash');
const assert = require('assert');
const util = require('util');
const Queryable = require('./queryable');
const Delete = require('./statement/delete');
const Insert = require('./statement/insert');
const Update = require('./statement/update');
const where = require('./statement/where');

/**
 * A database table.
 *
 * @class
 * @param {Object} args
 * @param {Object} args.db - A {@linkcode Database}.
 * @param {String} args.name - The entity's name.
 * @param {String} args.schema - Entity's owning schema.
 */
const Table = function(args) {
  Queryable.apply(this, arguments);

  this.pk = args.pk;
  this.pkRegexp = new RegExp(`^${this.pk}[^\\w\\d]?`);
  this.insertable = args.is_insertable_into || true;
};

util.inherits(Table, Queryable);

/**
 * Insert a record into the table.
 *
 * @param {Object|Array} data - A record or records to insert.
 * tables.
 * @param {Object} [options] - Insert options.
 * @param {Boolean} [options.build] - True to return the SQL *instead of* running
 * it.
 * @param {Boolean} [options.stream] - True to return a stream instead of a
 * resultset.
 * @return {Promise} An array containing the newly inserted row or rows.
 */
Table.prototype.insert = function (data, options) {
  assert(!!this.insertable, `${this.name} is not insertable`);
  assert(!!data, 'Must provide data to insert');

  const insert = new Insert(this, data, options);

  if (insert.params.length === 0) {
    // just return empty arrays so bulk inserting variable-length lists is more friendly
    return this.db.instance.$config.promise.resolve([]);
  }

  return this.db.query(insert);
};

/**
 * Update a record.
 *
 * May be invoked with a complete record (including primary key), or with a
 * criteria object and a map of fields to new values. Multi-row updates are
 * only possible through the latter usage.
 *
 * @param {Object} criteria - An updated record, or a criteria object.
 * @param {Object} fields - If using a criteria object without a primary key,
 * a hash of column names to their new values.
 * @param {Object} [options] - Update options.
 * @param {Boolean} [options.only] - False to propagate update to descendant
 * tables.
 * @param {Boolean} [options.build] - True to return the SQL *instead of* running
 * it.
 * @param {Boolean} [options.document] - This is a query against a document
 * table.
 * @param {Boolean} [options.single] - True to return a single object instead of
 * an array.
 * @param {Boolean} [options.stream] - True to return a stream instead of a
 * resultset.
 * @return {Promise} If updating a single record by its primary key, the
 * modified record; otherwise, an array containing any modified records.
 */
Table.prototype.update = function (criteria, fields, options={}) {
  if (_.isNil(fields)) {
    assert(!!this.pk, `${this.name} has no primary key, use update(criteria, changes)`);

    fields = criteria;

    criteria = _.fromPairs([[this.pk, fields[this.pk]]]);

    fields = _.omitBy(fields, (value, key) => {
      return _.isFunction(fields[key]) || key === this.pk;
    });

    options.single = true;
  }

  assert(_.isObjectLike(fields) && !_.isArray(fields), "Update requires a hash of fields=>values to update to");

  if (_.isEmpty(fields)) {
    // there's nothing to update, so just return the matching records
    if (options.single) {
      return this.findOne(criteria);
    } else {
      return this.find(criteria);
    }
  }

  const update = new Update(this, fields, criteria, options);

  return this.db.query(update);
};

/**
 * Performs an upsert. If the record does not include a value for the primary
 * key column, it will be inserted and the persisted record (including primary
 * key) returned; if it does, the row will be updated and the modified record
 * returned.
 *
 * @param {Object} record - The record to upsert.
 * @param {Object} [options] - An options object.
 * @param {Boolean} [options.only] - False to propagate update to descendant
 * tables.
 * @param {Boolean} [options.build] - True to return the SQL *instead of* running
 * it.
 * @param {Boolean} [options.single] - True to return a single object instead of
 * an array.
 * @param {Boolean} [options.stream] - True to return a stream instead of a
 * resultset.
 * @return {Promise} The inserted or updated record object.
 */
Table.prototype.save = function (record, options={}) {
  assert(!!this.pk, `${this.name} has no primary key, use insert or update to write to this table`);
  assert(_.isObjectLike(record) && !_.isArray(record), 'Must provide an object with all fields being modified and the primary key if updating');

  const keys = _.keys(record);

  if ((keys.indexOf(this.pk) > -1) || (keys.indexOf(`"${this.pk}"`) > -1)) {
    // prevent options from being read as changes in the bulk update format
    return this.update(record, null, options);
  } else {
    return this.insert.apply(this, arguments);
  }
};

/**
 * Delete a record or records.
 *
 * @param {Object} criteria - A criteria object or primary key.
 * @param {Object} [options] - Delete options.
 * @param {Boolean} [options.only] - False to propagate delete to descendant
 * tables.
 * @param {Boolean} [options.build] - True to return the SQL *instead of* running
 * it.
 * @param {Boolean} [options.document] - This is a query against a document
 * table.
 * @param {Boolean} [options.single] - True to return a single object instead of
 * an array.
 * @param {Boolean} [options.stream] - True to return a stream instead of a
 * resultset.
 * @return {Promise} An array of deleted records.
 */
Table.prototype.destroy = function (criteria, options) {
  return this.db.query(new Delete(this, criteria, options));
};

/**
 * Save a document to the database. This function replaces the entire document
 * body.
 *
 * @param {Object} doc - The document to write.
 * @return {Promise} The updated document.
 */
Table.prototype.saveDoc = function (doc) {
  assert(_.isObjectLike(doc) && !_.isArray(doc), "Please pass in the document for saving as an object. Include the primary key for an UPDATE.");

  const options = {single: true, document: true, generator: 'docGenerator'};

  if (doc[this.pk]) {
    return this.db.query(new Update(this, {body: _.omit(doc, this.pk)}, _.fromPairs([[this.pk, doc[this.pk]]]), options));
  } else {
    return this.db.query(new Insert(this, {body: doc}, options));
  }
};

/**
 * Update a document, adding new information and changing existing information.
 * This function can be used with any JSON field, not just document tables;
 * however, only document tables can use criteria objects which directly
 * reference document fields.
 *
 * If calling modify with a criteria object for a non-document table, the
 * criteria will be tested against the entire row (as opposed to the document
 * body as it is for document tables). To test elements of the JSON field in a
 * non-document table with a criteria object, use the JSON traversal operators
 * ->> and #>>.
 *
 * @param {String|Number|Object} criteria - Primary key of the document, or a
 * criteria object.
 * @param {Object} changes - Changes to apply.
 * @param {String} [field=body] - Document field name.
 * @return {Promise} If modifying a document table, the document; otherwise, the
 * modified row.
 */
Table.prototype.modify = function(criteria, changes, field = 'body') {
  let queryCriteria;

  const options = {
    document: field === 'body'
  };

  if (!_.isPlainObject(criteria)) {
    // primitive criteria will always reference the primary key
    criteria = _.fromPairs([[this.pk, criteria]]);

    options.single = true;
    options.generator = 'generator';
  }

  queryCriteria = where(criteria, 1, options.generator || (options.document ? 'docGenerator' : 'generator'));

  const sql = `UPDATE ${this.fullname} SET "${field}"="${field}" || $1 WHERE ${queryCriteria.conditions} RETURNING *;`;

  return this.db.query(sql, [JSON.stringify(changes)].concat(queryCriteria.params), options);
};

module.exports = Table;
