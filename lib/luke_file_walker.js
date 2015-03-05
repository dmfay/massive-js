var _ = require("underscore");
var path = require("path");
var fs = require("fs");


exports.walkDirectory = function(rootObject, rootDir){
  rootObject || (rootObject = {});

  var dirs = fs.readdirSync(rootDir);
  var self = this;
  _.each(dirs, function(item){
    var parsed = path.parse(item);
    if(parsed.ext === ".sql"){
      //var filePath = path.join(rootObject.currentPath, item);
      rootObject[parsed.name] = {};
      var filePath = path.join(rootDir,item);
      //rootObject[parsed.name] || (rootObject[parsed.name] = {});
      rootObject[parsed.name].name = parsed.name;
      rootObject[parsed.name].filePath = filePath;
      rootObject[parsed.name].sql = fs.readFileSync(filePath, {encoding : "utf-8"});

    }else if(parsed.ext !== ''){

      //ignore it
    }else{
      //walk it
      rootObject[parsed.name] = {};
      var pathToWalk = path.join(rootDir,item);

      self.walkDirectory(rootObject[parsed.name],pathToWalk);
    }
  });
  return rootObject;
};