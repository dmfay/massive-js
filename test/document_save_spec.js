var assert = require("assert");
var helpers = require("./helpers");
var db;

describe('Document saves', function () {
  
  before(function(done){
    helpers.resetDb(function(err,res){
      db = res;
      done()
    });
  });  

  describe("To a non-existent table", function () {
    
    before(function(done){

    });

  });

});