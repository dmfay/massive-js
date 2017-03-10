var _ = require("underscore")._;
var util = require("util");

var Query = function(args, object) {
  this.source = object.delimitedFullName;
  this.columns = args.columns || "*";
  this.only = args.only || false;
  this.order = args.order || (object.hasOwnProperty("pk") ? util.format('"%s"', object.pk) : "1");
  this.orderBody = args.orderBody || false;
  this.offset = args.offset;
  this.limit = args.limit;
  this.stream = args.stream;
  this.joins = args.joins;
  this.single = args.single || false;
};

Query.prototype.format = function (where) {
  var from = this.only ? " FROM ONLY " : " FROM ";

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

  var joins = [];
  if (_.isArray(this.joins)) {
    _.each(this.joins, function (join) {
      joins.push(util.format("%s", join));
    });
    joins = joins.join(',');
  }

  var sql = "";

  if (joins.length > 0) { sql = joins; }
  if (this.order) { sql += " order by " + this.order; }
  if (this.offset) { sql += " offset " + this.offset; }
  if (this.limit || this.single) { sql += " limit " + (this.limit || "1"); }
  return sql;
};

module.exports = Query;
