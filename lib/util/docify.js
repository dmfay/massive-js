'use strict';

const _ = require('lodash');

function docify(row) {
  let returnDoc = null;

  if (row) {
    returnDoc = row.body || {};
    returnDoc.id = row.id || null;
  }

  return returnDoc;
}

exports = module.exports = function (result) {
  if (_.isArray(result)) {
    return result.map(docify);
  } else {
    return docify(result);
  }
};
