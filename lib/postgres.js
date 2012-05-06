var events =require('events');
var util = require('util');
var _ = require('underscore')._;
var pg = require("pg");
var Query = require('./query')

//This function examines the passed-in object anc creates a WHERE statement for Postgres. This is pg client-specific.
//The type of object passed-in is important. If the value is a boolean or number, it will be appended as opposed to
//using parameters.

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
    return new Query(sql, parameters, this).where(where);
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

  this.end = function() { pg.end(); };

  this.placeholder = function(seed) { return '$' + seed; }

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