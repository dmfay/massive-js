'use strict';

var Promise = require('any-promise');
var arr = require('arrify');
var pg = require('pg');
var QueryStream = require('pg-query-stream');

function Runner(opts) {
  if (typeof opts.connectionString !== 'string') {
    throw new Error('`connectionString` must be a string');
  }
  this._connectionString = opts.connectionString;
}

Runner.prototype = {
  query: function(text, values) {
    var that = this;
    return new Promise(function(resolve, reject) {
      pg.connect(that._connectionString, function(err, client, done) {
        if (err) {
          return reject(err);
        }


        client.query(text, arr(values), function(err, result) {
          //we have the results, release the connection
          done();

          if (err) {
            return reject(err);
          }

          resolve(result.rows);
        });
      });
    });
  },

  stream: function(text, values) {
    var that = this;
    return new Promise(function(resolve, reject) {
      pg.connect(that._connectionString, function(err, client, done) {
        if (err) {
          return reject(err);
        }
        
        var query = new QueryStream(text, arr(values));

        var stream = client.query(query);

        stream.on('end', done);

        resolve(stream);
      });
    });
  },

  // close connections immediately
  end: function() {
    pg.end();
  }
};

module.exports = Runner;
