'use strict';

const _ = require('lodash');

/**
 * Transforms a record or records which contain a "body" field into a document
 * object or objects. Metadata is removed and the "id" field is moved into the
 * body.
 *
 * @module util/docify
 * @param {Array|Object} result - A record or list of records to transform.
 * @return {Array|Object} The transformed record or records.
 */
exports = module.exports = function (result) {
  /**
   * Transforms a single record containing a "body" field into a document object.
   *
   * @param {Object} row - A flat object representing a database record.
   * @return {Object} A document object generated from the row.
   */
  function docify (row) {
    if (row == null) {
      return null;
    }

    const returnDoc = _.cloneDeep(row.body);

    returnDoc.id = row.id;

    return returnDoc;
  }

  if (_.isArray(result)) {
    return result.map(docify);
  }

  return docify(result);
};
