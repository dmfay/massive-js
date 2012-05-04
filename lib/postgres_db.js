var events =require('events');
var util = require('util');
var _ = require('underscore')._;
var pg = require("pg");

var parseWhere = function(conditions) {

  var where = {};
  var params = [];
  if(_.isObject(conditions) &! _.isArray(conditions)) {

    var operations = {'=': '=', '!': '!=', '>': '>', '<': '<', '>=': '>=', '<=': '<=', '!=' : '<>', '<>': '<>'};
    var _conditions = [];
    var seed = params.length;

    _.each(conditions, function(value, key) {
      var parts = key.trim().split(/ +/);
      var property = parts[0];
      var operation = operations[parts[1]] || '=';

      if (_.isBoolean(value) || _.isNumber(value)) {
        _conditions.push(util.format('"%s" %s %d', property, operation, value));
      } else if (_.isArray(value)) {
        var arrayConditions = [];
        _.each(value, function(v) {
          arrayConditions.push('$' + ++seed);
          params.push(v);
        });
        _conditions.push(util.format('"%s" %s (%s)', property, operation == '!=' || operation == '<>' ? 'NOT IN' : 'IN', arrayConditions.join(', ')));
      } else {
        _conditions.push(util.format('"%s" %s %s', property, operation, '$' + ++seed));
        params.push(value);
      }
    });
    where.sql = ' \nWHERE ' + _conditions.join(' \nAND ');
    where.params = params;
  };
  return where;
};

var Query = function(sql, params, table) {
  events.EventEmitter.call(this);
  var self = this;
  this.sql = sql;
  this.params = params || [];
  this.table = table;
  
  self.on('newListener', function(eventName){
    console.log('Adding a listener for ' + eventName);
    if(eventName === 'row'){
      //fire the query
      //self.execute(self);
      //want to execute this! Where do we do it?
    }
  });

  this.order = function(){
    this.sql += util.format(" \nORDER BY %s", arguments[0]);
    return this;
  }

  this.limit = function() {
    if(arguments.length > 1){
      this.sql += util.format(" \nLIMIT(%d,%d)", arguments[0], arguments[1]);
    }else{
      this.sql += " \nLIMIT " + arguments[0];
    }
    return this;
  };
  this.raiseError = function(err){
    this.error = err;
    return this;
  };
  this.parseArgs = function(args) {
    var columns = " * ";
    var where = {};
    //if the first argument is an array, columns are specified
    if(args.length > 0 && _.isArray(args[0])){
      columns = args[0].join(",");
      this.sql = this.sql.replace("*", columns);
    }else if(args.length > 1 && args[1].columns) {
      this.sql = this.sql.replace("*", args[1].columns);
    
    }else if (args.length > 0 && _.isNumber(args[0])){
      var criteria = {};
      criteria[this.table.pk] = args[0];
      where = parseWhere(criteria);
      this.sql += where.sql;
      this.params = where.params;

    }else if (args.length > 0 && _.isObject(args[0])){
      where = parseWhere(args[0]);
      this.sql += where.sql;
      this.params = where.params;
    }
    return this;
  }

}
util.inherits(Query, events.EventEmitter);

var Table = function(tableName, pk) {
  var self = this;
  this.name = tableName;
  this.pk = pk;
  
  this.find = function() {
    var query = new Query("SELECT * FROM " + this.name, [], this);
    query.parseArgs(arguments);
    return query;

  };
  this.count = function(where) {
    var query = new Query("SELECT COUNT(1) FROM " + this.name);
    if(where) {
      var criteria = parseWhere(where);
      query.sql += criteria.sql;
      query.params.push(criteria.params);
    }
    return query;
  }
  this.destroy = function() {
    var query =  new Query("DELETE FROM " + this.name, [], this);
    query.parseArgs(arguments);
    return query;
  };

  this.insert = function(data) {
    if(!data) throw "insert should be called with data";//{ return new Query().raiseError("insert should be called with data"); }
    if (!_.isArray(data)) { data = [data]; }

    var sql = util.format("INSERT INTO %s (%s) VALUES\n", this.name, _.keys(data[0]).join(", "));
    var parameters = [];
    var values = []
    for(var i = 0, seed = 0; i < data.length; ++i) {
      var v = _.map(data[i], function() { return '$' + ++seed;});
      values.push(util.format('(%s)', v.join(', ')));
      parameters.push(_.values(data[i]));
    }
    sql += values.join(",\n");
    return new Query(sql, _.flatten(parameters));
  };

  this.update = function(fields, where){
    if(_.isObject(fields) === false) throw "Update requires a hash of fields=>values to update to";//{ return _query.error("Update requires a hash of fields=>values to update to"); }

    var parameters = [];
    var f = [];
    var seed = 0;
    _.each(fields, function(value, key) {
      f.push(key + ' = $' + ++seed);
      parameters.push(value);
    });
    var sql = util.format("UPDATE %s SET %s", this.name, f.join(', '));
    if(where){
      if(_.isNumber(where)){
        sql+= util.format(" \nWHERE \"%s\" = %d", this.pk, where);
      }else if (_.isString(where)){
        sql+= util.format(" \nWHERE \"%s\" = $%d", this.pk, parameters.length+1);
        parameters.push(where); 
      }else{
        where = parseWhere(where);
        sql += where.sql;
        if(where.params.length > 0) parameters.push(where.params);
      }
     
    }
    var query = new Query(sql, parameters, this);
    return query;
  };

}


var PostgresDB = function(connection){
  events.EventEmitter.call(this);

  this.dbType = "PostgreSQL";
  this.tables = [];
  this.connectionString = connection;
  this.sql = "";
  this.params = [];

  this.tableSQL = "SELECT                         \
    table_name as name,                           \
    (select cu.column_name                        \
      from                                        \
         information_schema.key_column_usage cu,  \
         information_schema.table_constraints tc  \
      where                                       \
        cu.constraint_name = tc.constraint_name   \
      and tc.table_name = ist.table_name          \
    ) as pk                                       \
    from information_schema.tables ist            \
    where table_schema NOT IN ('pg_catalog', 'information_schema')";

};
util.inherits(PostgresDB,events.EventEmitter);

PostgresDB.prototype.execute = function(sql, params, callback) {
  var self = this;
  pg.connect(self.connectionString, function(err,db){
    self.emit("beforeExecute", self);
    db.query(sql, params,function(err, results){
      if(err) callback(err,null);
      else {
        if(results.rows.length > 0){
          if(callback)callback(null,results.rows);
        }else{
          if(callback)callback(null,results);
        }
        self.emit("executed");
      }
    });
  });
}

PostgresDB.prototype.run = function(sql,params) {
  return new Query(sql,params);
}

PostgresDB.prototype.loadTables = function(callback) {
  var self = this;
  self.execute(self.tableSQL, [], function(err, tables){
    _.each(tables, function(table){
      var t = new Table(table.name, table.pk);
      self.tables.push(t);
      self[t.name] = t;
    });
    callback(null,self);
  });
};




//   var tables = [];
//   var connectionString = connection;

//   var self = this;
//   events.EventEmitter.call(self);

//   self.params = _params || [];
//   self.sql = _sql;

//   self.on('newListener', function(eventName){
//     console.log('Adding a listener for ' + eventName);
//     if(eventName === 'row'){
//       //fire the query
//       massive.Client.execute(self);
//     }
//   });

//   this._error = function(message) {
//     self.error = message;
//     return self;
//   }

//   this.execute = function(callback) {
//     if (self.error) { callback(self.error); return; }
//     massive.Client.execute(self,callback);
//   };

//   this.isSelect = function() {
//     return self.sql.indexOf('SELECT') > -1;
//   }
//   this.limit = function (count, offset){
//     var _limit = _.isUndefined(offset) ? util.format(' \nLIMIT %d', count) : util.format(' \nLIMIT(%d, %d)', count, offset);
//     self.sql += _limit;
//     return self;
//   }

//   this.columns = function(columns) {
//     if (arguments.length > 1) { columns = _.toArray(arguments); }
//     if (_.isArray(columns)) { columns = columns.join(', '); }
//     self.sql = self.sql.replace('SELECT *', 'SELECT ' + columns);
//     return self;
//   }

//   this.order = function(order) {
//     self.sql += ' \nORDER BY ' + order;
//     return self;
//   }

//   var _operations = {'=': '=', '!': '!=', '>': '>', '<': '<', '>=': '>=', '<=': '<=', '!=' : '<>', '<>': '<>'}
//   this.where = function(conditions) {
//     var _conditions = [];
//     var seed = self.params.length;

//     _.each(conditions, function(value, key) {
//       var parts = key.trim().split(/ +/);
//       var property = parts[0];
//       var operation = _operations[parts[1]] || '=';

//       if (_.isBoolean(value) || _.isNumber(value)) {
//         _conditions.push(util.format('"%s" %s %d', property, operation, value));
//       } else if (_.isArray(value)) {
//         var arrayConditions = [];
//         _.each(value, function(v) {
//           arrayConditions.push('$' + ++seed);
//           self.params.push(v);
//         });
//         _conditions.push(util.format('"%s" %s (%s)', property, operation == '!=' || operation == '<>' ? 'NOT IN' : 'IN', arrayConditions.join(', ')));
//       } else {
//         _conditions.push(util.format('"%s" %s %s', property, operation, '$' + ++seed));
//         self.params.push(value);
//       }
//     });

//     self.sql+= ' \nWHERE ' + _conditions.join(' \nAND ');
//     return self;
//   };
// }

// self.error = function(message) {
//   return new Query(null, null)._error(message);
// }


module.exports = PostgresDB;