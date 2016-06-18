var _ = require("underscore")._;
var util = require("util");

/**
 * Everything about a SELECT query that isn't the source object or the predicate.
 */
var QueryOptions = function(args, object) {
  this.columns = args.columns || "*";
  this.order = args.order || (object.hasOwnProperty("pk") ? util.format('"%s"', object.pk) : "1");
  this.orderBody = args.orderBody || false;
  this.offset = args.offset;
  this.limit = args.limit;
  this.stream = args.stream;
  this.single = args.single || false;
};

QueryOptions.prototype.selectList = function () {
  if (_.isArray(this.columns)) {
    return this.columns.join(',');
  }

  return this.columns;
};

QueryOptions.prototype.queryOptions = function () {
  if (_.isArray(this.order)) {
    var orderBody = this.orderBody;

    this.order = _.reduce(this.order, function (acc, val) {
      val.direction = val.direction || "asc";

      if (orderBody) {
        val.field = util.format("body->>'%s'", val.field);
      }

      if (val.type) {
        acc.push(util.format("(%s)::%s %s", val.field, val.type, val.direction));
      } else {
        acc.push(util.format("%s %s", val.field, val.direction));
      }

      return acc;
    }, []).join(",");
  }

  var sql = " order by " + this.order;

  if (this.offset) { sql += " offset " + this.offset; }
  if (this.limit || this.single) { sql += " limit " + (this.limit || "1"); }

  return sql;
};

module.exports = QueryOptions;
