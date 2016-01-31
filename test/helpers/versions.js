var helpers = require('./index');
var massive = require('../../index');
var connectionString = helpers.connectionString;
var gte95;

function init() {
  var db = massive.connectSync({
    connectionString: connectionString
  });
  var res = db.runSync('SELECT version()');
  var version = res[0].version;
  var matches = version.match(/PostgreSQL (\d+)\.(\d+)/);
  var major = parseInt(matches[1]);
  var minor = parseInt(matches[2]);

  gte95 = (major >= 9 && minor >= 5);
}

module.exports.skipBelow95 = function () {
  var args = Array.prototype.slice.call(arguments);

  if (gte95) {
    it.apply(null, args);
  } else {
    it.skip.apply(null, args);
  }
};

init();
