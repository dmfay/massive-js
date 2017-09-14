'use strict';

const _ = require('lodash');

/**
 * Represents an INSERT query.
 *
 * @class
 * @param {Table} source - Database object to query.
 * @param {Object|Array} record - A map of field names to values to be inserted,
 * or an array of same.
 * @param {Object} [options] - {@link https://dmfay.github.io/massive-js/options.html|Insert options}.
 */
const Insert = function (source, record, options = {}) {
  this.source = source.delimitedFullName;
  this.only = options.only;
  this.build = options.build;
  this.document = options.document;
  this.generator = options.generator;
  this.stream = options.stream;
  this.onConflictIgnore = options.onConflictIgnore;

  if (_.isArray(record)) {
    this.records = record;
  } else {
    this.single = true;
    this.records = [record];
  }

  const keys = _.keys(this.records[0]);

  this.columns = _.map(keys, key => `"${key}"`);
  this.params = _.reduce(this.records, (params, element) => params.concat(keys.map(key => element[key])), []);
};

/**
 * Format this object into a SQL INSERT.
 *
 * @return {String} A SQL INSERT statement.
 */
Insert.prototype.format = function () {
  let sql = `INSERT INTO ${this.source} (${this.columns.join(', ')}) VALUES `;

  let offset = 1;
  const values = this.records.reduce((acc) => {
    acc.push(_.range(offset, offset + this.columns.length).map(n => `$${n}`));

    offset += this.columns.length;

    return acc;
  }, []);

  sql += `${values.map(v => '(' + v.join(', ') + ')').join(', ')} `;

  if (this.onConflictIgnore) {
    sql += 'ON CONFLICT DO NOTHING ';
  }

  sql += `RETURNING *`;

  return sql;
};

module.exports = Insert;
