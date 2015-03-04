var _ = require("underscore")._;
var assert = require("assert");

var Document = function(args){
  assert(args.id && args.body, "This only works if you pass an id and a body");

  _.extend(this,args.body);
  this.id = args.id;

  this.toJSON = function(){
    //remove the id
    delete(this.id);
    return this;
  };

}