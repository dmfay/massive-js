var _ = require("underscore")._;

//A simple helper function to manage document ids
exports.formatArray = function(args){

  var result = [];
  _.each(args, function(doc){
    result.push(this.formatDocument(doc));
  }.bind(this));
  return result;
};

exports.formatDocument = function(args){
  var returnDoc = null;
  if(args){
    returnDoc = args.body || {};
    returnDoc.id = args.id || null;
  }
  return returnDoc;
};
