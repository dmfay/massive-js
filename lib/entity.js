'use strict';

/**
 * Base class for a database entity or script file.
 *
 * @class
 * @param {Object} spec - Entity arguments:
 * @param {Object} spec.db - A {@linkcode Database}.
 * @param {String} spec.name - The entity's name.
 * @param {String} spec.path - Path to the entity, if a file.
 * @param {String} spec.schema - Entity's owning schema, if a database object.
 * @param {String} spec.loader - Name of the loader that discovered the entity.
 */
const Entity = function (spec) {
  if (spec.path) {
    this.path = spec.path;
  } else {
    this.path = spec.schema === spec.db.currentSchema ? spec.name : `${spec.schema}.${spec.name}`;
  }

  this.schema = spec.schema || spec.db.currentSchema;
  this.name = spec.name;
  this.db = spec.db;
  this.loader = spec.loader;

  // create delimited names now instead of at query time
  this.delimitedName = `"${this.name}"`;
  this.delimitedSchema = `"${this.schema}"`;

  // handle naming when schema is other than default:
  if (this.schema !== this.db.currentSchema) {
    this.delimitedFullName = `${this.delimitedSchema}.${this.delimitedName}`;
  } else {
    this.delimitedFullName = this.delimitedName;
  }
};

module.exports = Entity;
