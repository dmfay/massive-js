const _ = require("underscore")._;
const util = require("util");
const Where = require("./where");

const Query = function() {
  const args = Array.prototype.slice.call(arguments);
  const object = args.pop();
  const options = args.pop();
  const conditions = args.shift();

  this.source = object.delimitedFullName;
  this.columns = options.columns || "*";
  this.only = options.only || false;
  this.orderBody = options.orderBody || false;
  this.offset = options.offset;
  this.limit = options.limit;
  this.stream = options.stream;
  this.single = options.single || false;
  this.formatter = options.formatter;

  switch (options.order) {
    case null: break; // if explicit null, do not set!
    case undefined: this.order = object.hasOwnProperty("pk") ? util.format('"%s"', object.pk) : "1"; break;
    default: this.order = options.order; break;
  }

  if (_.isObject(conditions) && !conditions.hasOwnProperty("where")) {
    this.where = Where.forTable(conditions);
  } else if (conditions && conditions.where) {
    this.where = {
      where: ` WHERE ${conditions.where} `,
      params: conditions.params
    };
  } else {
    this.where = { where : " WHERE TRUE " };
  }
};

Query.prototype.format = function (where) {
  where = where || this.where.where;
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

  var sql = "";

  if (this.order) { sql = " order by " + this.order; }
  if (this.offset) { sql += " offset " + this.offset; }
  if (this.limit || this.single) { sql += " limit " + (this.limit || "1"); }

  return sql;
};

module.exports = Query;
