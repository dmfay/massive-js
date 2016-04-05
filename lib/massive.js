'use strict';

var path = require('path');

var Promise = require('any-promise');
var assign = require('object-assign');

var arr = require('arrify');

var Runner = require('./runner');

var Table = require('./table');
var View = require('./table');
var createExecutable = require('./executable');

var readFile = require('./util').readFile;
var readdir = require('./util').readdir;
var stat = require('./util').stat;

var q = require('./quote');


var defaultOptions = {
  schema: ['%'],

  allowLoadTables: true,
  tablesIncludes: ['%'],
  tablesExcludes: [''],

  allowLoadViews: true,
  viewsIncludes: ['%'],
  viewsExcludes: [''],

  allowLoadFunctions: true,
  functionsIncludes: ['%'],
  functionsExcludes: [''],

  scriptsDir: path.join(process.cwd(), 'db'),
  scriptsDirDepth: 5,

  normalizeName: function(name) {
    return name;
  }
};

function Massive(opts) {
  this.opts = assign({}, defaultOptions, opts);

  Runner.call(this, this.opts);
}

Massive.prototype = Object.create(Runner.prototype);

Massive.prototype.loadTables = function() {
  var that = this;

  if (this.opts.allowLoadTables) {
    return this.querySqlFile(path.join(__dirname, 'scripts', 'tables.sql'), [this.opts.tablesIncludes, this.opts.tablesExcludes, this.opts.schema])
      .then(function(rows) {
        rows.forEach(function(row) {
          row.runner = that;
          that._addObjectRef(new Table(row), row.name, row.schema);
        });
      });
  } else {
    return Promise.resolve();
  }
};

Massive.prototype.loadViews = function() {
  var that = this;

  if (this.opts.allowLoadViews) {
    return this.querySqlFile(path.join(__dirname, 'scripts', 'views.sql'), [this.opts.viewsIncludes, this.opts.viewsExcludes, this.opts.schema])
      .then(function(rows) {
        rows.forEach(function(row) {
          row.runner = that;
          that._addObjectRef(new View(row), row.name, row.schema);
        });
      });
  } else {
    return Promise.resolve([]);
  }
};

Massive.prototype.querySqlFile = function(fileName, params) {
  var that = this;
  return readFile(fileName).then(function(sql) {
    return that.query(sql, params);
  });
};

Massive.prototype.loadFunctions = function() {
  var that = this;

  if (this.opts.allowLoadFunctions) {
    return this.querySqlFile(path.join(__dirname, 'scripts', 'functions.sql'), [this.opts.functionsIncludes, this.opts.functionsExcludes, this.opts.schema])
      .then(function(rows) {
        rows.forEach(function(row) {
          var params = [];
          for (var i = 0; i < row.param_count; i++) {
            params.push('$' + (i + 1));
          }
          var sql = 'select ' + (row.schema == 'public' ? q(row.name) : q(row.schema) + '.' + q(row.name)) + '(' + params.join(',') + ')';

          row.sql = sql;
          row.runner = that;
          that._addObjectRef(createExecutable(row), row.name, row.schema);
        });
      });
  } else {
    return Promise.resolve();
  }
};

function walkSqlFiles(runner, baseDir, rootObj, depth) {
  rootObj = rootObj || {};

  if (depth === 0) {
    return Promise.resolve(rootObj);
  }

  return readdir(baseDir)
    .then(function(files) {
      return Promise.all(files.map(function(file) {
        var fullPath = path.join(baseDir, file);
        return stat(fullPath)
          .then(function(stats) {
            return { path: fullPath, stats: stats };
          });
      }));
    })
    .then(function(fileEntries) {
      return Promise.all(fileEntries.map(function(entry) {
        var ext = path.extname(entry.path);
        var name = runner.opts.normalizeName(path.basename(entry.path, ext));
        if (entry.stats.isFile() && ext === '.sql') {
          return readFile(entry.path)
            .then(function(sql) {
              rootObj[name] = createExecutable({
                sql: sql,
                runner: runner
              });
            });
        } else if (entry.stats.isDirectory()) {
          rootObj[name] = {};
          return walkSqlFiles(runner, entry.path, rootObj[name], depth - 1);
        } else {
          return Promise.resolve();
        }
      }));
    })
    .then(function() {
      return rootObj;
    });
}

Massive.prototype.loadQueries = function() {
  var scriptsDir = path.resolve(this.opts.scriptsDir);

  return walkSqlFiles(this, scriptsDir, this, this.opts.scriptsDirDepth)
    .catch(function() {
      // it can happen dir does not exist
    });
};

Massive.prototype._addObjectRef = function(obj, name, schema) {
  name = this.opts.normalizeName(name);
  schema = this.opts.normalizeName(schema);

  if (schema === 'public') {
    this[name] = obj;
  } else {
    this[schema] = this[schema] || {};
    this[schema][name] = obj;
  }
};

Massive.prototype.load = function() {
  return Promise.all([ this.loadTables(), this.loadViews(), this.loadFunctions(), this.loadQueries() ]);
};

module.exports = Massive;
