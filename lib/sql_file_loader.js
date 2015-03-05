var _ = require("underscore");
var path = require("path");
var fs = require("fs");

var db, startDir;

var SqlFileLoader = function(args){
  db = args;
  startDir = db.scriptsDir;
  walkDirectory(db, startDir);
};

SqlFileLoader.prototype.loadFiles = function(){
  return walkDirectory(db, startDir);
}

walkDirectory = function(rootObject, rootDir){

  rootObject || (rootObject = {});

  var dirs = fs.readdirSync(rootDir);
  var self = this;
  _.each(dirs, function(item){
    var parsed = path.parse(item);
    if(parsed.ext === ".sql"){
      //var filePath = path.join(rootObject.currentPath, item);
      //rootObject[parsed.name] = {};
      var filePath = path.join(rootDir,item);
      //rootObject[parsed.name] || (rootObject[parsed.name] = {});
      //rootObject[parsed.name].name = parsed.name;
      //rootObject[parsed.name].filePath = filePath;
      //rootObject[parsed.name].sql = fs.readFileSync(filePath, {encoding : "utf-8"});
      var sql = fs.readFileSync(filePath, {encoding : "utf-8"});
      var propName = parsed.name;
      var q = function(args, next){

        //I have no idea why this works
        var sql = this[propName].sql;
        var db = this[propName].db;
        var params = _.isObject(args) ? args : {params : args};

        self.query(sql,params,{}, next);

      };
      var thisObject = rootObject[parsed.name] = q;
     
      //my god fix this I don't know what I'm doing
      thisObject.sql = sql;
      thisObject.db = db;
      db.queries.push(thisObject);
      //thisObject.db = self;
      //self.queries.push(self[propName]);
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

module.exports = SqlFileLoader;