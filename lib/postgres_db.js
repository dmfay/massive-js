var events =require('events');
var util = require('util');
var _ = require('underscore')._;
var pg = require("pg");

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
    db.query(self.sql, self.params,function(err, results){
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


PostgresDB.prototype.loadTables = function(callback) {
  var self = this;
  self.execute(self.tableSQL, [], function(err, tables){
    _.each(tables, function(table){
      console.log(table)
      var t = {name : table.name, pk : table.pk}
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