var _ = require("underscore")._;
var assert = require("assert");
var util = require('util');
var Where = require("./where");
var ArgTypes = require("./arg_types");
var DA = require("deasync");

/**
 * Base class for any database entity.
 * @param {[type]} args [description]
 */
var Entity = function(args) {
  this.schema = args.schema || 'public';
  this.name = args.name;
  this.db = args.db;

  // create delimited names now instead of at query time
  this.delimitedName = "\"" + this.name + "\"";
  this.delimitedSchema = "\"" + this.schema + "\"";

  // handle naming when schema is other than public:
  if(this.schema !== "public") {
    this.fullname = this.schema + "." + this.name;
    this.delimitedFullName = this.delimitedSchema + "." + this.delimitedName;
  } else {
    this.fullname = this.name;
    this.delimitedFullName = this.delimitedName;
  }
};

module.exports = Entity;