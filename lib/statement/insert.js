'use strict';

const _ = require('lodash');
const prepareParams = require('../util/prepare-params');

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
  this.source = source;
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

  const fields = [..._.reduce(this.records, (set, r) => {
    _.forEach(_.keys(r), set.add.bind(set));

    return set;
  }, new Set())];

  this.columns = _.intersection(fields, this.source.columns);
  this.junctions = _.difference(fields, this.source.columns);

  const recordParams = prepareParams(this.columns, this.records);

  if (this.junctions.length) {
    if (this.records.length > 1) {
      throw new Error('Deep insert is only supported for single records');
    }

    // append all junction params (that aren't stubbing out the foreign keys)
    // to the insert's parameter list
    // TODO generate junction field set to allow more flexibility between
    // junction records for the same relationship
    this.params = _.reduce(this.junctions, (allParams, j) => {
      const junction = this.records[0][j];
      const junctionParams = prepareParams(Object.keys(junction[0]), junction);

      return allParams.concat(junctionParams.filter(v => v !== undefined));
    }, recordParams);
  } else {
    this.params = recordParams;
  }
};

/**
 * Format this object into a SQL INSERT.
 *
 * @return {String} A SQL INSERT statement.
 */
Insert.prototype.format = function () {
  const quotedColumns = this.columns.map(f => `"${f}"`);

  let sql = `INSERT INTO ${this.source.delimitedFullName} (${quotedColumns.join(', ')}) VALUES `;

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

  if (this.junctions.length) {
    const junctionQueries = _.reduce(this.junctions, (queries, j, idx) => {
      return queries.concat(this.records[0][j].map((r, jdx) => {
        // separate out keyColumns so they are consistently positioned in the
        // CTE since they won't necessarily be ordered in the source map
        const keyColumns = [];
        const valColumns = [];

        _.keys(r).forEach(k => {
          if (r[k] === undefined) {
            keyColumns.push(k);
          } else {
            valColumns.push(k);
          }
        });

        const allQuotedColumns = keyColumns.concat(valColumns).map(k => `"${k}"`);

        const rValues = _.range(offset, offset + valColumns.length).map(n => `$${n}`);

        offset += valColumns.length;

        return `q_${idx}_${jdx} AS (INSERT INTO ${j} (${allQuotedColumns.join(', ')}) SELECT "${this.source.pk}", ${rValues.join(', ')} FROM inserted)`;
      }));
    }, []);

    sql = `WITH inserted AS (${sql}), ${junctionQueries.join(', ')} SELECT * FROM inserted`;
  }

  return sql;
};

module.exports = Insert;
