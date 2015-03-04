var massive = require("./index");
var glob = require("glob");
var _ = require("underscore")._;
var fs = require("fs");

massive.connect({connectionString : "postgres://rob@localhost/chinook"}, function(err,db){
  db.film_docs.findDoc({title: "Academy Dinosaur"}, function(err,res){
    console.log(res)
  })
});

// var sqlFiles = glob.sync("db/**/*.sql");
// _.each(sqlFiles, function(file){
//   var cleaned = file.replace("db/", "");
//   var splits = cleaned.split("/");
//   var sqlFile = _.last(splits).replace(".sql", "");
//   if(splits.length > 1){
//     var stub = splits[0];
//     stuff[stub]={};
//     stuff[stub][sqlFile]=fs.readFileSync(file, {encoding : "utf-8"});
//   }else{
//     stuff[sqlFile]=fs.readFileSync(file, {encoding : "utf-8"});
//   }
// });
//console.log(stuff)

// //read the directories
// _.each(dirs, function(dir){
//   var files = glob.sync("db/"+dir+"/*.sql");
//   console.log(files)
//   _.each(files, function(file){
//     stuff[dir] = fs.readFileSync(file, {encoding : "utf-8"});
//   });
// });

// //read the files

// massive.connect("postgres://rob@localhost/chinook", function(err,db){
//   db.film_docs.findDoc({film_id : [1,2,4,5]}, function(err,res){
//     console.log(res)
//   });
// });
  
//ideas!

/*
tell don't ask: make saveDoc, findDoc etc explicit
search and searchDoc - tsvector on the fly. Override with your own SQL or somehow the API will do it.


DB builder - schema directory with tables, functions, views, schema, etc.
Figure out how to load schemas.
*/