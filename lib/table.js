var _query = require('./query');
var _ = require("underscore")._;
var util = require("util");

var Table = function(tableName, primaryKey) {
  this.tableName = tableName;
  this.primaryKey = primaryKey || "id";

  this.count = function(where) {
    var query = new _query("SELECT COUNT(1) FROM " + this.tableName);
    return where ? query.where(where) : query;
  };

  this.all = function(where){
    var query = new _query("SELECT * FROM " + this.tableName);
    return where ? query.where(where) : query;
  };

  this.destroy = function(where) {
    var query = new _query("DELETE FROM " + this.tableName);
    return where ? query.where(where) : query;
  }

  this.insert = function(data) {
    if(!data) { return _query.error("insert should be called with data"); }
    if (!_.isArray(data)) { data = [data]; }

    var sql = util.format("INSERT INTO %s (%s) VALUES\n", this.tableName, _.keys(data[0]).join(", "));
    var parameters = [];
    var values = []
    for(var i = 0, seed = 0; i < data.length; ++i) {
      var v = _.map(data[i], function() { return '$' + ++seed;});
      values.push(util.format('(%s)', v.join(', ')));
      parameters.push(_.values(data[i]));
    }
    sql += values.join(",\n");
    return new _query(sql, _.flatten(parameters));
  };


  this.update = function(fields, where){
    if(_.isObject(fields) === false) { return _query.error("Update requires a hash of fields=>values to update to"); }

    var parameters = [];
    var f = [];
    var seed = 0;
    _.each(fields, function(value, key) {
      f.push(key + ' = $' + ++seed);
      parameters.push(value);
    });
    var sql = util.format("UPDATE %s SET %s", this.tableName, f.join(', '));
    var query = new _query(sql, parameters);

    if (_.isUndefined(where)) { return query; }
    if (_.isObject(where)) { return query.where(where); }

    var criteria = {}
    criteria[this.primaryKey] = where;
    return query.where(criteria);
  };

};

module.exports = Table;