var util = require('util');
var _ = require('underscore')._;
var Query = require('./query');

var Table = function(tableName, pk, _db) {
  var self = this;
  this.name = tableName;
  this.pk = pk;
  this.db = _db;

  this.last = function(callback) {
    this.find().last(callback);
  };
  this.first = function(callback) {
    this.find().first(callback);
  };

  this.each = function(callback) {
    this.find().each(callback);
  };

  this.find = function() {
    return new Query("SELECT * FROM " + this.name, [], this).parseArgs(arguments)
  };

  this.count = function(where) {
    return new Query("SELECT COUNT(1) FROM " + this.name, [] ,this).where(where);
  };

  this.destroy = function() {
    return new Query("DELETE FROM " + this.name, [], this).parseArgs(arguments)
  };

  this.insert = function(data) {
    if(!data) throw "insert should be called with data";//{ return new Query().raiseError("insert should be called with data"); }
    if (!_.isArray(data)) { data = [data]; }

    var sql = util.format("INSERT INTO %s (%s) VALUES\n", this.name, _.keys(data[0]).join(", "));
    var parameters = [];
    var values = []
    for(var i = 0, seed = 0; i < data.length; ++i) {
      var v = _.map(data[i], function() { return self.db.placeholder(++seed);});
      values.push(util.format('(%s)', v.join(', ')));
      parameters.push(_.values(data[i]));
    }
    sql += values.join(",\n");
    if (self.db.insertKludge) { sql += self.db.insertKludge(); }
    return new Query(sql, _.flatten(parameters), this);
  };

  this.update = function(fields, where){
    if(_.isObject(fields) === false) throw "Update requires a hash of fields=>values to update to";//{ return _query.error("Update requires a hash of fields=>values to update to"); }

    var parameters = [];
    var f = [];
    var seed = 0;
    _.each(fields, function(value, key) {
      f.push(key + ' = ' + self.db.placeholder(++seed));
      parameters.push(value);
    });
    var sql = util.format("UPDATE %s SET %s", this.name, f.join(', '));
    return new Query(sql, parameters, this).where(where);
  };
};

module.exports = Table;