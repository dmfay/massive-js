'use strict';

const _ = require('lodash');

function docify(row) {
  if (row == null) {
    return null;
  }

  let returnDoc = _.cloneDeep(row.body);

  returnDoc.id = row.id;

  return returnDoc;
}

exports = module.exports = function (result) {
  if (_.isArray(result)) {
    return result.map(docify);
  } else {
    return docify(result);
  }
};
