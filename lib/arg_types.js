var Args = require("args-js");
var _ = require("underscore")._;

//TODO: Duplication in here, DRY it up...

//A Wrapper for arguments used with Table.query
exports.queryArgs = function(arguments){
  var args = Args([
    {sql : Args.STRING | Args.Required},
    {params : Args.ARRAY | Args.Optional, _default : []},
    {options : Args.OBJECT | Args.Optional, _default : {single : false}},
    {next : Args.FUNCTION | Args.Optional, _default : function(err,res){
      if(err) console.log(err);
      else console.log(res);
    }}
  ], arguments);
  if(!_.isArray(args.params)) args.params = [args.params];
  return args;
}

//Used with Table.where and Table.count
exports.whereArgs = function(arguments){
  var args = Args([
    {where : Args.STRING | Args.Optional, _default : "1=1"},
    {params : Args.ANY | Args.Optional, _default : []},
    {next : Args.FUNCTION | Args.Optional, _default : function(err,res){
      if(err) console.log(err)
      else console.log(res)
    }}
  ], arguments);
  if(!_.isArray(args.params)) args.params = [args.params];

  return args;
}

//Used with Table.find
exports.findArgs = function(arguments){
  return Args([
    {conditions : Args.ANY | Args.Optional, _default : {}},
    {options : Args.OBJECT | Args.Optional, _default : {}},
    {next : Args.FUNCTION | Args.Optional, _default : function(err,res){
      if(err) console.log(err)
      else console.log(res)
    }}
  ], arguments);
}