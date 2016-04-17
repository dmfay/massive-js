var _ = require("underscore")._;
var util = require("util");

/**
 * Everything about a SELECT query that isn't the source object or the predicate.
 */
var QueryOptions = function(args, object) {
  this.select = args.columns || "*";
  this.order = args.order || (object.hasOwnProperty("pk") ? util.format('"%s"', object.pk) : "1");
  this.offset = args.offset;
  this.limit = args.limit;
  this.stream = args.stream;
  this.single = args.single || false;
};

QueryOptions.prototype.selectList = function () {
  if (_.isArray(this.select)) {
    return this.select.join(',');
  }

  return this.select;
};

QueryOptions.prototype.queryOptions = function () {
  var sql = " order by " + this.order;

  if (this.offset) { sql += " offset " + this.offset; }
  if (this.limit || this.single) { sql += " limit " + (this.limit || "1"); }

  return sql;
};

module.exports = QueryOptions;
