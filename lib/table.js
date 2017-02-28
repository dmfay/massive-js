'use strict';
const _ = require("underscore")._;
const assert = require("assert");
const util = require('util');
const DocumentTable = require("./document_table");
const Queryable = require("./queryable");
const where = require("./query/where");

//a simple wrapper for a table
const Table = function(args) {
  Queryable.apply(this, arguments);

  this.pk = args.pk;

  _.extend(this,DocumentTable);
};

util.inherits(Table, Queryable);

Table.prototype.insert = function (data) {
  let returnSingle = false;

  if (!data) {
    return Promise.reject(new Error("insert should be called with data"));
  } else if (!_.isArray(data)) {
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

Table.prototype.update = function(conditions, fields) {
  const options = {};

  if (_.isUndefined(fields)) {
    const pkName = this.primaryKeyName();

    fields = conditions;
    conditions = {};

    conditions[pkName] = fields[pkName];

    fields = _.omit(fields, function(value, key, object) {
      return _.isFunction(object[key]) || key === pkName;
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

Table.prototype.primaryKeyName = function () {
  return this.pk;
};

Table.prototype.delimitedPrimaryKeyName = function () {
  return `"${this.pk}"`;
};

Table.prototype.containsPk = function(args){
  const keys = _.keys(args);
  return (keys.indexOf(this.primaryKeyName()) > -1) || (keys.indexOf(this.delimitedPrimaryKeyName()) > -1);
};

Table.prototype.save = function(args) {
  assert(_.isObject(args), "Please pass in the criteria for saving as an object. This should include all fields needed to change or add. Include the primary key for an UPDATE.");

  if (this.containsPk(args)) {
    return this.update(args);
  } else {
    return this.insert(args);
  }
};

Table.prototype.destroy = function(args) {
  assert(_.isObject(args), "Please pass in the criteria for deleting. This should be in object format - {id : 1} for example");
  const criteria = where(args);
  const sql = `DELETE FROM ONLY ${this.delimitedFullName} ${criteria.conditions} RETURNING *;`;

  return this.db.query(sql, criteria.params);
};

module.exports = Table;
