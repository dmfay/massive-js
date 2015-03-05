var pg = require("pg");
var fs = require("fs");
var assert = require("assert");
var _ = require("underscore")._;
var ArgTypes = require("./arg_types");
var Args = require("args-js");

var DB = function(connectionString){
  assert.ok(connectionString, "Need a connection string");
  this.connectionString = connectionString;
};

DB.prototype.query = function () {

  //var args = ArgTypes.defaultQuery(arguments);
  //we expect sql, options, params and a callback
  var args = Args([
    {sql : Args.STRING | Args.Required},
    {params : Args.OBJECT | Args.Optional, _default : []},
    {options : Args.OBJECT | Args.Optional, _default : {single : false}},
    {next : Args.FUNCTION | Args.Optional, _default : function(err,res){
      if(err) console.log(err);
      else console.log(res);
      return true;
    }}
  ], arguments);

  //check to see if the params are an array, which they need to be 
  //for the pg module
  if(_.isObject(args.params)){
    //we only need the values from the object,
    //so swap it out
    args.params = _.values(args.params);
  }else if(!_.isArray(args.params)){
    args.params = [args.params];
  }

  pg.connect(this.connectionString, function (err, db, done) {
    assert.ok(err === null, err);
    db.query(args.sql, args.params, function (err, result) {
      done(db);
      if(err){
        args.next(err,null);
      }else{
        if(args.options.single){
          var singleRow = result.rows.length >= 0 ? result.rows[0] : null;
          args.next(null,singleRow);
        }else{
          args.next(err, result.rows);
        }
        
      }
    });
  });
};


DB.prototype.executeSqlFile = function(args,next){
  var self = this;
  var fileSql = fs.readFileSync(args.file, {encoding: 'utf-8'});
  self.query(fileSql, next);
};




module.exports = DB;
