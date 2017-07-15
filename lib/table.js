'use strict';

const _ = require('lodash');
const assert = require('assert');
const util = require('util');
const Queryable = require('./queryable');
const where = require('./query/where');
const isPkSearch = require('./query/isPkSearch');

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
    return this.db.instance.$config.promise.resolve([]);  // just return empty arrays so bulk inserting variable-length lists is more friendly
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

  assert(_.isObjectLike(fields) && !_.isArray(fields), "Update requires a hash of fields=>values to update to");

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
  assert(_.isObjectLike(args) && !_.isArray(args), 'Must provide an object with all fields being modified and the primary key if updating');

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
  assert(_.isObjectLike(args) && !_.isArray(args), 'Must provide a criteria object to delete data');

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
  assert(_.isObjectLike(doc) && !_.isArray(doc), "Please pass in the document for saving as an object. Include the primary key for an UPDATE.");
  let sql, params = [];
  const pkVal = doc[this.pk];

  // if there's a primary key, don't store it in the body as well
  params.push(JSON.stringify(_.omit(doc, this.pk)));

  if (pkVal) {
    sql = `update ${this.fullname} set body = $1 where ${this.pk} = $2 returning *;`;
    params.push(pkVal);
  } else {
    sql = `insert into ${this.fullname} (body) values($1) returning *;`;
  }

  return this.db.query(sql, params, {single: true, document: true, generator: 'docGenerator'});
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

  if (isPkSearch(criteria)) {
    // TODO where is about due for a refactor to accommodate pk searches internally
    queryCriteria = {
      conditions: '\nWHERE id = $2',
      params: criteria
    };

    options.single = true;
  } else {
    queryCriteria = where(criteria, 1, '\nWHERE ', options.document ? 'docGenerator' : 'generator');
  }

  const sql = `update ${this.fullname} set "${field}"="${field}" || $1 ${queryCriteria.conditions} returning *;`;

  return this.db.query(sql, [JSON.stringify(changes)].concat(queryCriteria.params), options);
};

module.exports = Table;
