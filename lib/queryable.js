'use strict';

var q = require('./quote');

// view or table
function Queryable(opts) {
  this.name = opts.name;
  this.schema = opts.schema;

  this.fullName = (this.schema == 'public' ? q(this.name) : q(this.schema) + '.' + q(this.name));

  this._runner = opts.runner;
}

function isPlainObject(obj) {
  return obj !== null && typeof obj === 'object' && Object.prototype.toString.call(obj) === '[object Object]';
}

Queryable.prototype = {
  find: function(conditions, opts) {
    var condition = this._getCondition(conditions);
    return this.where(condition.where, condition.params, opts);
  },

  where: function(where, params, opts) {
    var sql = [
      'select',
        this._getColumns(opts),
      'from', this.fullName,
      where,
      this._getOrder(opts),
      this._getLimit(opts),
      this._getOffset(opts)
    ].join(' ');

    if (opts.stream) {
      return this._runner.stream(sql, params);
    } else {
      return this._runner.query(sql, params );
    }
  },

  findOne: function(conditions, opts) {
    opts = opts || {};
    opts.limit = 1;
    opts.stream = false;
    return this.find(conditions, opts)
      .then(function(rows) {
        return rows[0];
      });
  },

  whereOne: function(where, params, opts) {
    opts = opts || {};
    opts.limit = 1;
    opts.stream = false;
    return this.where(where, params, opts)
      .then(function(rows) {
        return rows[0];
      });
  },

  count: function(conditions, params, opts) {
    if (typeof conditions === 'string') {
      opts = opts || {};
      opts.columns = ['count(1)'];
      opts.order = null;
      return this.whereOne(conditions, params, opts)
        .then(function(row) {
          return row.count;
        });
    } else {
      params = params || {};
      params.columns = ['count(1)'];
      params.order = null;
      return this.findOne(conditions, params)
        .then(function(row) {
          return row.count;
        });
    }
  },

  _getLimit: function(opts) {
    switch (typeof opts.limit) {
      case 'undefined':
        return '';
      case 'string':
      case 'number':
        return 'limit ' + opts.limit;
      default:
        throw new Error('Invalid `limit` value');
    }
  },

  _getColumns: function(opts) {
    var t = typeof opts.columns;
    if (t === 'undefined') {
      return '*';
    } else if (t === 'string') {
      return opts.columns;
    } else if (Array.isArray(opts.columns)) {
      return opts.columns.join(',');
    } else {
      throw new Error('Invalid `columns` value');
    }
  },

  _getCondition: function(conditions, idx) {
    var params = [];
    var where = [];

    idx = idx || 1;

    Object.keys(conditions || {}).forEach(function(column) {
      var value = conditions[column];

      if (value == null) { // TODO what to do with undefined?
        where.push(column + ' IS NULL');
      } else if (isPlainObject(value)) {
        Object.keys(value).forEach(function(operator) {
          var v = value[operator];
          where.push(column + ' ' + operator + ' $' + idx++);
          params.push(v);
        });
      } else {
        where.push(column + ' = $' + idx++);
        params.push(value);
      }
    });

    return {
      params: params,
      where: where.length ? 'where ' + where.join(' and ') : ''
    };
  },

  _getOffset: function(opts) {
    switch (typeof opts.offset) {
      case 'undefined':
        return '';
      case 'string':
      case 'number':
        return 'offset ' + opts.offset;
      default:
        throw new Error('Invalid `offset` value');
    }
  },

  _getOrder: function(opts) {
    var t = typeof opts.order;
    if (t === 'undefined') {
      return '';
    } else if (t === 'string') {
      return 'order by ' + opts.order;
    } else if (Array.isArray(opts.order)) {
      return 'order by ' + opts.order.join(',');
    } else if (t === 'object' && opts.order != null) {
      return 'order by ' + Object.keys(opts.order).map(function(col) {
        return col + ' ' + opts.order[col];
      }).join(',');
    } else if (opts.order === null) {
      return '';
    } else {
      throw new Error('Invalid `columns` value');
    }
  }
};

module.exports = Queryable;
