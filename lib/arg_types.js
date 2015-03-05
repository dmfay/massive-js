var Args = require("args-js");

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