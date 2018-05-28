'use strict';

const Entity = require('../lib/entity');

describe('Entity', function () {
  it('should use the spec path if there is one', function () {
    const e = new Entity({
      db: 'connected instance',
      loader: 'tables',
      path: 'one.test_entity',
      name: 'test_entity',
      schema: 'one'
    });

    assert.deepEqual(e, {
      db: 'connected instance',
      path: 'one.test_entity',
      name: 'test_entity',
      schema: 'one',
      loader: 'tables',
      delimitedName: '"test_entity"',
      delimitedSchema: '"one"',
      delimitedFullName: '"one"."test_entity"'
    });
  });

  it('should create a base entity from a spec', function () {
    const e = new Entity({
      db: 'connected instance',
      loader: 'tables',
      name: 'test_entity',
      schema: 'one'
    });

    assert.deepEqual(e, {
      db: 'connected instance',
      loader: 'tables',
      path: 'one.test_entity',
      name: 'test_entity',
      schema: 'one',
      delimitedName: '"test_entity"',
      delimitedSchema: '"one"',
      delimitedFullName: '"one"."test_entity"'
    });
  });

  it('should default to the current schema', function () {
    const e = new Entity({
      db: {currentSchema: 'other'},
      loader: 'tables',
      name: 'test_entity',
      schema: 'other'
    });

    assert.deepEqual(e, {
      db: {currentSchema: 'other'},
      path: 'test_entity',
      name: 'test_entity',
      schema: 'other',
      loader: 'tables',
      delimitedName: '"test_entity"',
      delimitedSchema: '"other"',
      delimitedFullName: '"test_entity"'
    });
  });
});
