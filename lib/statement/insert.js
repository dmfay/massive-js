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

  this.columns = _.map(_.keys(this.records[0]), key => `"${key}"`);
  this.params = _.flatten(this.records.map(r => _.values(r)));
};

/**
 * Format this object into a SQL INSERT.
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
