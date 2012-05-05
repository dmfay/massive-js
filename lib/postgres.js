var events =require('events');
var util = require('util');
var _ = require('underscore')._;
var pg = require("pg");

//This function examines the passed-in object anc creates a WHERE statement for Postgres. This is pg client-specific.
//The type of object passed-in is important. If the value is a boolean or number, it will be appended as opposed to 
//using parameters.
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
  self.sql = sql;
  self.params = params || [];
  self.table = table;
  self.db = table.db;
  self.columns = ""
  self.where = {};
  self.limit = "";
  self.order = "";

  self.on('newListener', function(eventName){
    if(eventName === 'row'){
      //fire the query
      self.each();
    }
  });

  self.order = function(){
    self.sql += util.format(" \nORDER BY %s", arguments[0]);
    return self;
  }

  self.limit = function() {
    if(arguments.length > 1){
      self.sql += util.format(" \nLIMIT(%d,%d)", arguments[0], arguments[1]);
    }else{
      self.sql += " \nLIMIT " + arguments[0];
    }
    return self;
  };
  self.raiseError = function(err){
    self.error = err;
    return self;
  };
  self.parseArgs = function(args) {
    if(_.isFunction(args[0])) return;
    var columns = " * ";
    var where = {};
    //if the first argument is an array, columns are specified
    if(args.length > 0 && _.isArray(args[0])){
      columns = args[0].join(",");
      self.sql = self.sql.replace("*", columns);
    //if the second arg has {columns : "..."} then columns are also specified
    }else if(args.length > 1 && args[1].columns) {
      self.sql = self.sql.replace("*", args[1].columns);
    //if the argument is numeric (instead of an object) - default it to a PK lookup
    }else if (args.length > 0 && _.isNumber(args[0])){
      var criteria = {};
      criteria[self.table.pk] = args[0];
      where = parseWhere(criteria);
      self.sql += where.sql;
      self.params = where.params;
    //if the argument is an object, parse a where statement
    }else if (args.length > 0 && _.isObject(args[0])){
      where = parseWhere(args[0]);
      self.sql += where.sql;
      self.params = where.params;
    }
    return self;
  }

  //execution uses the Client
  self.execute = function(callback) {
    self.db.execute(self.sql, self.params, function(err,result,client){
      if(callback) callback(err,result,client);
      self.emit("executed",client);
    })
  }

  //built-in iteration. This fetches the results using a callback
  //TODO: use the PG client's built in streamer for this
  self.each = function(callback) {
    self.db.execute(self.sql,self.params, function(err,results){
      if(err && callback) callback(err,self.raiseError(err));
      else {
        _.each(results, function(r){
          self.emit("row", r);
          if(callback) callback(null,r);
        });
        self.emit("end");
      }
    });
  };

  self.first = function(callback) {
    self.sql += " LIMIT(1) ";
    self.db.execute(self.sql,self.params, function(err,results){
      if(err) callback(err,self.raiseError(err));
      else callback(null,results[0]);
    });
  };
  self.last = function(callback) {
    self.sql += util.format(" ORDER BY %s DESC LIMIT(1) ", this.table.pk);
    self.db.execute(self.sql,self.params, function(err,results){
      if(err) callback(err,self.raiseError(err));
      else callback(null,results[0]);
    });
  };
}
util.inherits(Query, events.EventEmitter);

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
    var query = new Query("SELECT * FROM " + this.name, [], this);
    query.parseArgs(arguments);
    return query;
  };
  this.count = function(where) {
    var query = new Query("SELECT COUNT(1) FROM " + this.name, [] ,this);
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
    sql += values.join(",\n") + " \nRETURNING *";
    return new Query(sql, _.flatten(parameters), this);
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


var Postgres = function(connection){
  events.EventEmitter.call(this);
  var self = this;
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

  this.end = function() {
    pg.end();
  }

  this.execute = function(sql, params, callback) {

    pg.connect(self.connectionString, function(err,db){
      self.emit("beforeExecute", self);
      db.query(sql, params,function(err, results){

        if(err && callback) {
          callback(err,null,db)
          self.emit("error", err);
        }else {
          if(results && results.rows.length > 0){
            if(callback)callback(null,results.rows,db);
          }else {
            if(callback)callback(null,results,db);
          }
          self.emit("executed");
        }
      });
    });
  };
  this.run = function(sql,params) {
    return new Query(sql,params, this);
  };

  this.loadTables = function(callback) {
    self.execute(self.tableSQL, [], function(err, tables){
      _.each(tables, function(table){
        var t = new Table(table.name, table.pk, self);
        self.tables.push(t);
        self[t.name] = t;
      });
      callback(null,self);
    });
  };
var _translateType = function(typeName) {
  var _result = typeName;

  switch(typeName){
    case "pk" :
      _result ="serial PRIMARY KEY";
      break;
    case "money" :
      _result ="decimal(8,2)";
      break;
    case "date" :
      _result = "timestamptz";
      break;
    case "string" :
      _result ="varchar(255)";
      break;
    case "search" :
      _result ="tsvector";
      break;
    case "int" :
      _result ="int4";
      break;
  }
  return _result;
}

var _containsPK = function(columns) {
  return _.any(columns.values,"pk");
}

this.dropTable = function(tableName) {
  return new Query("DROP TABLE IF EXISTS " + tableName + ";", [], new Table(tableName, "", self));
}

this.createTable = function(tableName, columns) {

  var _sql ="CREATE TABLE " + tableName + "(";
  var _cols = [];

  //force a PK
  if(!_containsPK(columns)){
    columns.id = "pk";
  }

  for(var c in columns){

    if(c == "timestamps"){
      _cols.push("created_at timestamptz not null default 'now'");
      _cols.push("updated_at timestamptz not null default 'now'");
    }else{
      var colName = c;
      var colParts = columns[c].split(" ");
      var colType = colParts[0];
      var translated = _translateType(colType);
      var extras = _.without(colParts,colType).join(" ");
      var declaration = colName + " " + translated + " " + extras;
      //console.log(declaration);
      _cols.push(declaration);
    }
  }

  _sql+= _cols.join(",") + ");";
  //console.log(_sql);
  return new Query(_sql, [], new Table(tableName, columns.id, self));
};


};
util.inherits(Postgres,events.EventEmitter);

module.exports = Postgres;