'use strict';

const _ = require('lodash');
const isPkSearch = require('./isPkSearch');
const where = require('./where');

const Query = function (conditions = {}, options = {}, object = {}) {
  this.source = object.delimitedFullName;
  this.columns = options.columns || "*";
  this.only = options.only || false;
  this.orderBody = options.orderBody || false;
  this.offset = options.offset;
  this.limit = options.limit;
  this.stream = options.stream;
  this.single = options.single || false;
  this.document = options.document;

  switch (options.order) {
    case null: break; // for aggregation -- need to omit ORDER BY clause entirely
    case undefined: this.order = object.hasOwnProperty("pk") ? `"${object.pk}"` : "1"; break;
    default: this.order = options.order; break;
  }

  if (isPkSearch(conditions, options)) {
    if (typeof object.primaryKeyName === 'function') {
      if (_.isObject(conditions)) {
        // id:val search
        this.where = where(conditions);
      } else {
        // primitive pk search
        this.where = where(_.fromPairs([[object.primaryKeyName(), conditions]]));
        this.single = true;
      }
    } else {
      // trying to query a view with a pk!
      this.where = { where : " WHERE TRUE " };
    }
  } else {
    if (conditions.hasOwnProperty('conditions')) {
      // pre-built predicates (full-text searches and Queryable.where style calls use this)
      this.where = {
        conditions: ` WHERE ${conditions.conditions} `,
        params: conditions.params
      };
    } else if (this.document) {
      // document queries not deferring to table
      this.where = where(conditions, 0, '\nWHERE', 'docGenerator');
    } else {
      // standard case for queryables
      this.where = where(conditions);
    }
  }
};

Query.prototype.format = function (where) {
  where = where || this.where.conditions;
  const from = this.only ? " FROM ONLY " : " FROM ";

  return "SELECT " + this.selectList() + from + this.source + where + this.queryOptions();
};

Query.prototype.selectList = function () {
  if (_.isArray(this.columns)) {
    return this.columns.join(',');
  }

  return this.columns;
};

Query.prototype.queryOptions = function () {
  if (_.isArray(this.order)) {
    const orderBody = this.orderBody;

    this.order = _.reduce(this.order, function (acc, val) {
      val.direction = val.direction || "asc";

      if (orderBody) {
        val.field = `body->>'${val.field}'`;
      }

      if (val.type) {
        acc.push(`(${val.field})::${val.type} ${val.direction}`);
      } else {
        acc.push(`${val.field} ${val.direction}`);
      }

      return acc;
    }, []).join(",");
  }

  let sql = "";

  if (this.order) { sql = " order by " + this.order; }
  if (this.offset) { sql += " offset " + this.offset; }
  if (this.limit || this.single) { sql += " limit " + (this.limit || "1"); }

  return sql;
};

module.exports = Query;
