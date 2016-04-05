'use strict';

var arr = require('arrify');

var Queryable = require('./queryable');

function Table(opts) {
  this.pk = arr(opts.pk);

  Queryable.call(this, opts);
}

Table.prototype = Object.create(Queryable.prototype);

Table.prototype._getOrder = function(opts) {
  if (typeof opts.order === 'undefined') {
    opts.order = this.pk;
  }

  return Queryable.prototype._getOrder.call(this, opts);
};

Table.prototype.insert = function(data) {
  if (!data) {
    throw new Error('insert should be called with data');
  }
  var returnSingle = !Array.isArray(data);
  if (returnSingle) {
    data = [data];
  }

  var columnNames = Object.keys(data[0]);

  var sql = 'INSERT INTO ' + this.fullName + '(' + columnNames.join(',') + ') VALUES\n';

  var params = [];
  var values = [];
  var idx = 1;

  data.forEach(function(row) {
    var v = Object.keys(row).map(function(col) {
      params.push(row[col]);
      return '$' + (idx++);
    });
    values.push('(' + v.join(',') + ')');
  });
  sql += values.join(",\n");
  sql += " RETURNING *";

  return this._runner.query(sql, params )
    .then(function(rows) {
      if (returnSingle) {
        return rows[0];
      } else {
        return rows;
      }
    });
};

Table.prototype.update = function(conditions, fields) {
  if (!conditions || !fields) {
    throw new Error("Conditions and fields for update must be supplied");
  }

  var params = [];
  var f = [];
  var idx = 1;

  if (typeof fields === 'string') {
    f.push(fields);
  } else if (Array.isArray(fields)) {
    f = fields;
  } else {
    Object.keys(fields).forEach(function(field) {
      var value = fields[field];

      f.push(field + ' = $' + (idx++));
      params.push(value);
    });
  }

  var sql = 'UPDATE ' + this.fullName + ' SET ' + f.join(',');
  var condition = this._getCondition(conditions, idx);
  sql += ' ' + condition.where;
  sql += " RETURNING *";

  params = params.concat(condition.params);

  return this._runner.query(sql, params );
};


Table.prototype.destroy = function(conditions) {
  if (!conditions) {
    throw new Error("Conditions for destroy must be supplied");
  }

  var sql = "delete from " + this.fullName;

  var condition = this._getCondition(conditions);
  sql += ' ' + condition.where;
  sql += " RETURNING *";

  return this._runner.query(sql, condition.params );
};

module.exports = Table;
