var _ = require("underscore")._;
var assert = require("assert");
var util = require('util');
var DocumentTable = require("./document_table");
var Queryable = require("./queryable");
var Where = require("./where");
var DA = require("deasync");

//a simple wrapper for a table
var Table = function(args) {
  Queryable.apply(this, arguments);

  this.pk = args.pk;

  _.extend(this,DocumentTable);
};

util.inherits(Table, Queryable);

Table.prototype.insert = function(data, next) {
  var returnSingle = false;

  if (!data) {
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
    var v = _.map(data[i], fn);
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
    var pkName = this.primaryKeyName();

    hasConditions = false;
    next = fields;
    fields = conditions;
    conditions = {};

    conditions[pkName] = fields[pkName];

    fields = _.omit(fields, function(value, key, object) {
      return _.isFunction(object[key]) || key === pkName;
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

  var sql = util.format("UPDATE %s SET %s", this.delimitedFullName, f.join(', '));

  if (!hasConditions || !_.isEmpty(conditions)) {
    var parsedWhere = Where.forTable(conditions, parameters.length);

    sql += parsedWhere.where;
  }

  sql += " RETURNING *";

  parameters = parameters.concat(_.flatten(_.values(conditions), true));

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

  if(this.containsPk(args)){
    this.update(args,next);
  }else{
    this.insert(args,next);
  }
};
Table.prototype.saveSync = DA(Table.prototype.save);

Table.prototype.destroy = function(args, next){
  assert(_.isObject(args), "Please pass in the criteria for deleting. This should be in object format - {id : 1} for example");
  var sql = "delete from " + this.delimitedFullName;
  var where = {};

  if (Object.keys(args).length > 0) {
    where = Where.forTable(args);
    sql += where.where;
  }

  sql += " RETURNING *";
  this.db.query(sql, where.params, next);
};
Table.prototype.destroySync = DA(Table.prototype.destroy);

Table.prototype.search = function(args, next){
  //search expects a columns array and the term
  assert(args.columns && args.term, "Need columns as an array and a term string");
  if(!_.isArray(args.columns)){
    args.columns = [args.columns];
  }
  var tsv;
  var vectorFormat = 'to_tsvector("%s")';
  if(args.columns.length === 1){
    tsv = util.format("%s", args.columns[0]);
  }else{
    vectorFormat = 'to_tsvector(%s)';
    tsv= util.format("concat(%s)", args.columns.join(", ' ', "));
  }
  var sql = "select * from " + this.delimitedFullName + " where " + util.format(vectorFormat, tsv);
  sql+= " @@ to_tsquery($1);";

  this.db.query(sql, [args.term],next);
};
Table.prototype.searchSync = DA(Table.prototype.search);

module.exports = Table;
