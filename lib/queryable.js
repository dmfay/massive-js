'use strict';
const _ = require("underscore")._;
const assert = require("assert");
const util = require('util');
const Entity = require('./entity');
const Query = require("./query");
const Where = require("./where");

/**
 * Represents a queryable database entity (table or view).
 * @param {[type]} args [description]
 */
const Queryable = function() {
  Entity.apply(this, arguments);

  // create delimited names now instead of at query time
  this.delimitedName = "\"" + this.name + "\"";
  this.delimitedSchema = "\"" + this.schema + "\"";

  // handle naming when schema is other than public:
  if(this.schema !== "public") {
    this.fullname = this.schema + "." + this.name;
    this.delimitedFullName = this.delimitedSchema + "." + this.delimitedName;
  } else {
    this.fullname = this.name;
    this.delimitedFullName = this.delimitedName;
  }
};

util.inherits(Queryable, Entity);

//a simple alias for returning a single record
Queryable.prototype.findOne = function () {
  return this.find.apply(this, arguments).then(results => {
    if (results.length > 0) { return Promise.resolve(results[0]); }

    return Promise.resolve(results);
  });
};

/**
 * Counts rows and calls back with any error and the total. There are two ways to use this method:
 *
 * 1. find() style: db.mytable.count({field: value}, callback);
 * 2. where() style: db.mytable.count("field=$1", [value], callback);
 */
Queryable.prototype.count = function(conditions = {}, params = []) {
  // TODO crappy hack for where/find signature switching, fix me
  if (_.isString(conditions)) {
    conditions = {
      where: conditions,
      params: params
    };
  }

  const query = new Query(conditions, {columns: "COUNT(1)", order: null, single: true}, this);

  return this.db.query(query).then(res => Promise.resolve(res.count));
};

//a simple way to just run something
//just pass in "id=$1" and the criteria
Queryable.prototype.where = function(conditions = "true", params = []) {
  if (!_.isArray(params)) { params = [params]; }

  const query = new Query({where: conditions, params: params}, {}, this);

  return this.db.query(query);
};

Queryable.prototype.find = function(conditions = {}, options = {}) {
  if (conditions === '*') { conditions = {}; }

  const keys = _.keys(conditions);

  if (Where.isPkSearch(conditions)) {
    if (typeof this.primaryKeyName === 'function') {
      conditions = _.object([[this.primaryKeyName(), conditions]]);
      options.forceTable = true; // pk is a column so treat as standard queryable
      options.single = true;
    } else {
      // can't search a view/etc by a primitive pk, so ignore conditions
      conditions = {};
    }
  } else if (options.document && keys.length === 1 && /^id[^\w\d]?/.test(keys[0])) {
    // document query with pk criteria
    options.forceTable = true;
  }

  return this.db.query(new Query(conditions, options, this));
};

Queryable.prototype.search = function(fields = {}, options = {}) {
  //search expects a columns array and the term
  assert(fields.columns && fields.term, "Need columns as an array and a term string");

  let params = [fields.term], tsv;

  if (!_.isArray(fields.columns)) { fields.columns = [fields.columns]; }

  // TODO 'where' functionality might be better at processing search params for JSON etc
  if (fields.columns.length === 1) {
    tsv = fields.columns[0];
    if (tsv.indexOf('>>') === -1) {
      tsv = `"${tsv}"`; // just a column, quote it to preserve casing
    }
  } else {
    tsv = `concat(${fields.columns.join(", ' ', ")})`;
  }

  const conditions = {
    where: `to_tsvector(${tsv}) @@ to_tsquery($1) `,
    params: params
  };

  if (fields.where) {
    const where = Where.forTable(fields.where, 1, " AND ");
    conditions.where += where.where;
    conditions.params = conditions.params.concat(where.params);
  }

  const query = new Query(conditions, options, this);

  return this.db.query(query);
};

module.exports = Queryable;
