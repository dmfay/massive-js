'use strict';

var Massive = require('./lib/massive');

module.exports = function(opts) {
  var massive = new Massive(opts);
  return massive.load()
    .then(function() {
      return massive;
    });
};
