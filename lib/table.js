var _ = require("underscore")._;
var assert = require("assert");
var util = require('util');
var DocumentTable = require("./document_table");
var Queryable = require("./queryable");
var Where = require("./where");
var DA = require("deasync");
var ArgTypes = require("./arg_types");

//a simple wrapper for a table
var Table = function(args) {
  Queryable.apply(this, arguments);

  this.pk = args.pk;
  this.insertable = args.hasOwnProperty('is_insertable') ? args.is_insertable : true;

  _.extend(this,DocumentTable);
};

util.inherits(Table, Queryable);

Table.prototype.insert = function(data, next) {
  var returnSingle = false;

  if (!this.insertable) {
    return next(new Error('table does not allow inserts'));
  } else if (!data) {
    return next(new Error("insert should be called with data"));
  } else if (!_.isArray(data)) {
    returnSingle = true;
    data = [data];
  } else if (data.length === 0) {
    return next(null, []);  // just return empty arrays so bulk inserting variable-length lists is more friendly
  }

  var delimitedColumnNames = _.map(_.keys(data[0]), function(key){return util.format('"%s"', key);});
  var sql = util.format("INSERT INTO %s (%s) VALUES\n", this.delimitedFullName, delimitedColumnNames.join(", "));
  var parameters = [];
  var values = [];
  var fn = function() { return "$" + (++seed); };

  for(var i = 0, seed = 0; i < data.length; ++i) {
    var v = _.map(Object.keys(data[i]), fn);
    values.push(util.format('(%s)', v.join(', ')));
    parameters.push(_.values(data[i]));
  }
  sql += values.join(",\n");
  sql += " RETURNING *";
  this.db.query(sql, _.flatten(parameters, true), {single : returnSingle}, next);
};
Table.prototype.insertSync = DA(Table.prototype.insert);

Table.prototype.update = function(conditions, fields, next) {
  var hasConditions = true;
  var options = {};

  if (_.isFunction(fields)) {
    next = fields;
    fields = conditions;

    if (!this.pk) {
      return next(new Error('No primary key, use the (criteria, updates) signature'));
    }

    hasConditions = false;
    conditions = {};

    conditions[this.pk] = fields[this.pk];

    fields = _.omit(fields, function(value, key, object) {
      return _.isFunction(object[key]) || key === this.pk;
    });

    options.single = true;
  }

  assert(_.isObject(fields), "Update requires a hash of fields=>values to update to");

  if (_.isEmpty(fields)) {
    // there's nothing to update, so just return the matching records
    if (options.single) {
      return this.findOne(conditions, next);
    } else {
      return this.find(conditions, next);
    }
  }

  var parameters = [];
  var f = [];
  var seed = 0;

  _.each(fields, function(value, key) {
    f.push(util.format('"%s" = $%s', key, (++seed)));
    parameters.push(value);
  });

  var sql = util.format("UPDATE ONLY %s SET %s", this.delimitedFullName, f.join(', '));

  if (!hasConditions || !_.isEmpty(conditions)) {
    var parsedWhere = Where.forTable(conditions, parameters.length);

    sql += parsedWhere.where;
  }

  sql += " RETURNING *";

  parameters = parameters.concat(
    _.chain(conditions)
    .values()
    .flatten()
    .without(null)  // nulls are inlined in the WHERE
    .value()
  );

  this.db.query(sql, parameters, options, next);
};
Table.prototype.updateSync = DA(Table.prototype.update);

Table.prototype.primaryKeyName = function(){
  return this.pk;
};

Table.prototype.delimitedPrimaryKeyName = function() {
  return util.format('"%s"', this.pk);
};

Table.prototype.containsPk = function(args){
  var keys = _.keys(args);
  return (keys.indexOf(this.primaryKeyName()) > -1) || (keys.indexOf(this.delimitedPrimaryKeyName()) > -1);
};

Table.prototype.save = function(args, next){
  assert(_.isObject(args), "Please pass in the criteria for saving as an object. This should include all fields needed to change or add. Include the primary key for an UPDATE.");

  if (!this.pk) {
    return next(new Error('No primary key, use insert or update to write to this table'));
  }

  if(this.containsPk(args)){
    this.update(args,next);
  }else{
    this.insert(args,next);
  }
};
Table.prototype.saveSync = DA(Table.prototype.save);

Table.prototype.destroy = function(args, next){
  assert(_.isObject(args), "Please pass in the criteria for deleting. This should be in object format - {id : 1} for example");
  var sql = "DELETE FROM ONLY " + this.delimitedFullName;
  var where = {};

  if (Object.keys(args).length > 0) {
    where = Where.forTable(args);
    sql += where.where;
  }

  sql += " RETURNING *";
  this.db.query(sql, where.params, next);
};
Table.prototype.destroySync = DA(Table.prototype.destroy);

Table.prototype.search = function(){
  var args = ArgTypes.searchArgs(arguments, this);

  //search expects a columns array and the term
  assert(args.fields.columns && args.fields.term, "Need columns as an array and a term string");
  var params = [args.fields.term];
  if(!_.isArray(args.fields.columns)){
    args.fields.columns = [args.fields.columns];
  }
  var tsv;
  var vectorFormat = 'to_tsvector("%s")';
  if(args.fields.columns.length === 1){
    tsv = util.format("%s", args.fields.columns[0]);
    if(args.fields.columns[0].indexOf('>>') !== -1){
      vectorFormat = 'to_tsvector(%s)';
    }
  }else{
    vectorFormat = 'to_tsvector(%s)';
    tsv= util.format("concat(%s)", args.fields.columns.join(", ' ', "));
  }

  var whereString = "";
  if (args.fields.where) {
    var where = Where.forTable(args.fields.where, 'predicate', 1, " AND ");
    whereString = where.where;
    params = params.concat(where.params);
  }
  var sql = args.query.format(util.format(" WHERE " + vectorFormat + " @@ to_tsquery($1) %s", tsv, whereString));
  this.db.query(sql, params, args.options, args.next);
};
Table.prototype.searchSync = DA(Table.prototype.search);

module.exports = Table;
