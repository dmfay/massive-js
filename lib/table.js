'use strict';

const _ = require('lodash');
const assert = require('assert');
const util = require('util');
const Queryable = require('./queryable');
const where = require('./query/where');

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
  this.insertable = args.is_insertable_into || true;
};

util.inherits(Table, Queryable);

/**
 * Insert a record into the table.
 *
 * @param {Object|Array} data - A record or records to insert.
 */
Table.prototype.insert = function (data) {
  let returnSingle = false;

  assert(!!this.insertable, `${this.name} is not insertable`);
  assert(!!data, 'Must provide data to insert');

  if (!_.isArray(data)) {
    returnSingle = true;
    data = [data];
  } else if (data.length === 0) {
    return Promise.resolve([]);  // just return empty arrays so bulk inserting variable-length lists is more friendly
  }

  const delimitedColumnNames = _.map(_.keys(data[0]), key => `"${key}"`);
  let sql = `INSERT INTO ${this.delimitedFullName} (${delimitedColumnNames.join(', ')}) VALUES\n`;
  const parameters = [];
  const values = [];
  const fn = function() { return "$" + (++seed); };

  for(var i = 0, seed = 0; i < data.length; ++i) {
    const v = _.map(Object.keys(data[i]), fn);
    values.push(`(${v.join(', ')})`);
    parameters.push(_.values(data[i]));
  }
  sql += values.join(",\n");
  sql += " RETURNING *";
  return this.db.query(sql, _.flatten(parameters, true), {single : returnSingle});
};

/**
 * Update a record.
 *
 * May be invoked with a complete record (including primary key), or with a
 * conditions criteria object and a map of fields to new values. Multi-row
 * updates are only possible through the latter usage.
 *
 * @param {Object} conditions - An updated record, or a criteria object.
 * @param {Object} fields - If using a criteria object, a hash of column names
 * to their new values.
 */
Table.prototype.update = function(conditions, fields) {
  const options = {};

  if (_.isUndefined(fields)) {
    assert(!!this.pk, `${this.name} has no primary key, use the (criteria, changes) update`);

    fields = conditions;
    conditions = {};

    conditions[this.pk] = fields[this.pk];

    fields = _.omit(fields, function(value, key, object) {
      return _.isFunction(object[key]) || key === this.pk;
    });

    options.single = true;
  }

  assert(_.isObject(fields), "Update requires a hash of fields=>values to update to");

  if (_.isEmpty(fields)) {
    // there's nothing to update, so just return the matching records
    if (options.single) {
      return this.findOne(conditions);
    } else {
      return this.find(conditions);
    }
  }

  const parameters = [];
  let seed = 0;

  const f = _.reduce(fields, (acc, value, key) => {
    parameters.push(value);
    acc.push(`"${key}" = $${++seed}`);

    return acc;
  }, []);

  const criteria = where(conditions, parameters.length);
  const sql = `UPDATE ONLY ${this.delimitedFullName} SET ${f.join(', ')} ${criteria.conditions} RETURNING *;`;

  return this.db.query(sql, parameters.concat(criteria.params), options);
};

// TODO refactor
Table.prototype.primaryKeyName = function () {
  return this.pk;
};

/**
 * Test whether args contains this table's primary key.
 */
Table.prototype.containsPk = function (args) {
  const keys = _.keys(args);
  return (keys.indexOf(this.pk) > -1) || (keys.indexOf(`"${this.pk}"`) > -1);
};

/**
 * Insert (if it does not have a primary key value) or update (otherwise) a
 * record.
 *
 * @param {Object} args - Record to upsert.
 */
Table.prototype.save = function (args) {
  assert(!!this.pk, `${this.name} has no primary key, use insert or update to write to this table`);
  assert(_.isObject(args), 'Must provide an object with all fields being modified and the primary key if updating');

  if (this.containsPk(args)) {
    return this.update(args);
  } else {
    return this.insert(args);
  }
};

/**
 * Delete a record or records.
 *
 * @param {Object} args - Deletion criteria object.
 */
Table.prototype.destroy = function(args) {
  assert(_.isObject(args), 'Must provide a criteria object to delete data');

  const criteria = where(args);
  const sql = `DELETE FROM ONLY ${this.delimitedFullName} ${criteria.conditions} RETURNING *;`;

  return this.db.query(sql, criteria.params);
};

/**
 * Save a document to the database. This function replaces the entire document
 * body.
 *
 * @param {Object} doc - The document to write.
 * @return {Promise} The updated document.
 */
Table.prototype.saveDoc = function(doc) {
  assert(_.isObject(doc), "Please pass in the document for saving as an object. Include the primary key for an UPDATE.");
  let sql, params = [];
  const pkName = this.primaryKeyName();
  const pkVal = doc[pkName];

  // if there's a primary key, don't store it in the body as well
  params.push(JSON.stringify(_.omit(doc, pkName)));

  if (pkVal) {
    sql = `update ${this.fullname} set body = $1 where ${pkName} = $2 returning *;`;
    params.push(pkVal);
  } else {
    sql = `insert into ${this.fullname} (body) values($1) returning *;`;
  }

  return this.db.query(sql, params, {single: true, document: true, generator: 'docGenerator'});
};

/**
 * Update a document, adding new information and changing existing information.
 * This function can be used with any JSON field, not just document tables.
 *
 * @param {String|Number} id - Primary key of the document or row to modify.
 * @param {Object} changes - Changes to apply.
 * @param {String} [field=body] - Document field name.
 * @return {Promise} If modifying a document table, the document; otherwise, the modified row.
 */
Table.prototype.modify = function(id, changes, field = 'body') {
  const pkName = this.primaryKeyName();
  const sql = `update ${this.fullname} set "${field}"="${field}" || $1 where ${pkName} = $2 returning *;`;

  return this.db.query(sql, [JSON.stringify(changes), id], {single: true, document: field === 'body'});
};

module.exports = Table;
