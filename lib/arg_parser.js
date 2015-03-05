var _ = require("underscore")._;

//takes in an arguments object and parses args, options, callback
exports.parse = function(){
  var args = Array.prototype.slice.call(arguments);
  var result = {
    args : null,
    options : null,
    callback : function(err,res){
      if(err) console.log(err);
      else console.log(res);
    }
  };

  //if args is null...

  //args is a function

  //args is an array

  //length is 1
  if(arguments.length === 1){
    result.args = _.isFunction(arguments[0]) ? null : arguments[0];
    result.options = null;
    result.callback = _.isFunction(arguments[0]) ? arguments[0] : null;
  }
  //length is 2
  if(arguments.length === 2){
    result.args = arguments[0];
    result.options = _.isFunction(arguments[1]) ? null : arguments[1];
    result.callback = _.isFunction(arguments[1]) ? arguments[1] : null;
  }
  //length is 3
  if(arguments.length === 3){
    result.args = arguments[0];
    result.options = arguments[1];
    result.callback = arguments[2];
  }


  return result;

}