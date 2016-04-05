'use strict';

var fs = require('fs');

var Promise = require('any-promise');
var stripBom = require('strip-bom');

exports.readFile = function readFile(fileName) {
  return new Promise(function(resolve, reject) {
    fs.readFile(fileName, function(err, buffer) {
      if (err) {
        return reject(err);
      }

      resolve(stripBom(buffer).toString('utf-8'));
    });
  });
};

exports.readdir = function readdir(dir) {
  return new Promise(function(resolve, reject) {
    fs.readdir(dir, function(err, files) {
      if (err) {
        return reject(err);
      }

      resolve(files);
    });
  });
};

exports.stat = function stat(p) {
  return new Promise(function(resolve, reject) {
    fs.stat(p, function(err, stats) {
      if (err) {
        return reject(err);
      }

      resolve(stats);
    });
  });
};
