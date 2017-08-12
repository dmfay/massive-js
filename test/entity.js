'use strict';

const Entity = require('../lib/entity');

describe('Entity', function () {
  it('should create a base entity from a spec', function () {
    const e = new Entity({
      db: 'connected instance',
      path: 'one.two',
      name: 'test_entity',
      schema: 'one'
    });

    assert.deepEqual(e, {
      db: 'connected instance',
      path: 'one.two',
      name: 'test_entity',
      schema: 'one',
      delimitedName: '"test_entity"',
      delimitedSchema: '"one"',
      delimitedFullName: '"one"."test_entity"'
    });
  });

  it('should default to the current schema', function () {
    const e = new Entity({
      db: { currentSchema: 'other' },
      path: 'one.two',
      name: 'test_entity'
    });

    assert.deepEqual(e, {
      db: { currentSchema: 'other' },
      path: 'one.two',
      name: 'test_entity',
      schema: 'other',
      delimitedName: '"test_entity"',
      delimitedSchema: '"other"',
      delimitedFullName: '"other"."test_entity"'
    });
  });
});
