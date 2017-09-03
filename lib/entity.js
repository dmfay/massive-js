'use strict';

/**
 * Base class for a database entity or script file.
 *
 * @class
 * @param {Object} spec - Entity arguments:
 * @param {Object} spec.db - A {@linkcode Database}.
 * @param {String} spec.name - The entity's name.
 * @param {String} spec.schema - Entity's owning schema.
 */
const Entity = function (spec) {
  this.schema = spec.schema || spec.db.currentSchema;
  this.path = spec.path;
  this.name = spec.name;
  this.db = spec.db;

  // create delimited names now instead of at query time
  this.delimitedName = `"${this.name}"`;
  this.delimitedSchema = `"${this.schema}"`;
  this.delimitedFullName = `${this.delimitedSchema}.${this.delimitedName}`;
};

module.exports = Entity;
