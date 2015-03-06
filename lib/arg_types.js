var Args = require("args-js");
var _ = require("underscore")._;

exports.defaultQuery = function(arguments){
  return Args([
      {sql : Args.STRING | Args.Optional},
      {options : Args.OBJECT | Args.Optional},
      {params : Args.OBJECT | Args.Optional, _default : []},
      {next : Args.FUNCTION | Args.Optional, 
        _default : function(err,res){
          if(err) console.log(err);
          console.log(res);
        }
      }
    ], arguments);
}

exports.whereArgs = function(arguments){
  return Args([
    {where : Args.STRING | Args.Optional, _default : "1=1"},
    {params : Args.ARRAY | Args.Optional, _default : [], _check : function(params){
      return _.isArray(params) ? params : [params];
    }},
    {next : Args.FUNCTION | Args.Optional, _default : function(err,res){
      if(err) console.log(err)
      else console.log(res)
    }}
  ], arguments);
}

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