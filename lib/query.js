const _ = require("underscore")._;
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
  this.document = options.document;

  switch (options.order) {
    case null: break; // for aggregation -- need to omit ORDER BY clause entirely
    case undefined: this.order = object.hasOwnProperty("pk") ? `"${object.pk}"` : "1"; break;
    default: this.order = options.order; break;
  }

  if (_.isObject(conditions) && conditions.hasOwnProperty('where')) {
    // pre-built predicates (full-text searches use this)
    this.where = {
      where: ` WHERE ${conditions.where} `,
      params: conditions.params
    };
  } else if (_.isObject(conditions) && this.document && !options.forceTable) {
    // document queries not deferring to table
    this.where = Where.forDocument(conditions);
  } else if (!_.isObject(conditions) || !_.isEmpty(conditions)) {
    // generic queryables, primitive pk queries
    this.where = Where.forTable(conditions);
  } else {
    // anything else use minimal clause that we can append to
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

  var sql = "";

  if (this.order) { sql = " order by " + this.order; }
  if (this.offset) { sql += " offset " + this.offset; }
  if (this.limit || this.single) { sql += " limit " + (this.limit || "1"); }

  return sql;
};

module.exports = Query;
