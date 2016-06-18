/* eslint-disable no-console */

var Args = require("args-js");
var _ = require("underscore")._;
var QueryOptions = require('./query_options');

//TODO: Duplication in here, DRY it up...

//A Wrapper for arguments used with Table.query
exports.queryArgs = function(args){
  args = Args([
    {sql : Args.STRING | Args.Required},
    {params : Args.ARRAY | Args.Optional, _default : []},
    {options : Args.OBJECT | Args.Optional, _default : {single : false}},
    {next : Args.FUNCTION | Args.Optional, _default : function(err,res){
      if(err) console.log(err);
      else console.log(res);
    }}
  ], args);
  if(!_.isArray(args.params)) args.params = [args.params];
  return args;
};

//Used with Table.where and Table.count
exports.whereArgs = function(args){
  args = Args([
    {where : Args.STRING | Args.Optional, _default : "1=1"},
    {params : Args.ANY | Args.Optional, _default : []},
    {next : Args.FUNCTION | Args.Optional, _default : function(err,res){
      if(err) console.log(err);
      else console.log(res);
    }}
  ], args);
  if(!_.isArray(args.params)) args.params = [args.params];

  return args;
};

//Used with Table.search
exports.searchArgs = function(args, source) {
  args = Args([
    {fields : Args.OBJECT | Args.Optional, _default: {}},
    {options: Args.OBJECT | Args.Optional, _default: {}},
    {next : Args.FUNCTION | Args.Optional, _default: function(err, res){
      if(err) console.log(err);
      else console.log(res);
    }}
  ], args);

  args.options = new QueryOptions(args.options, source);

  return args;
};

//Used with Table.find
exports.findArgs = function(args, source) {
  args = Args([
    {conditions : Args.ANY | Args.Optional, _default : {}},
    {options : Args.OBJECT | Args.Optional, _default: {}},
    {next : Args.FUNCTION | Args.Optional, _default : function(err,res){
      if(err) console.log(err);
      else console.log(res);
    }}
  ], args);

  if (_.isFunction(args.conditions)) {
    //this is our callback as the only argument, caught by Args.ANY
    args.next = args.conditions;
    args.conditions = {};
  }

  args.options = new QueryOptions(args.options, source);

  return args;
};

exports.forArgs = function(args) {
  return Args([
    {conditions: Args.OBJECT},
    {generator: Args.STRING | Args.Optional, _default: 'predicate'},
    {placeholderOffset: Args.INT | Args.Optional, _default: 0},
    {prefix: Args.STRING | Args.Optional, _default: ' \nWHERE '}
  ], args);
};
