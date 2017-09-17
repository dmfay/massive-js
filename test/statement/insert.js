'use strict';

const Insert = require('../../lib/statement/insert');

describe('Insert', function () {
  const source = {
    delimitedFullName: 'testsource',
    isPkSearch: () => false
  };

  describe('ctor', function () {
    it('should have defaults', function () {
      const query = new Insert(source);

      assert.equal(query.source, 'testsource');
    });

    it('should apply options', function () {
      const query = new Insert(source, {}, {build: true});

      assert.equal(query.source, 'testsource');
      assert.isTrue(query.build);
    });

    it('should process columns and parameters', function () {
      const query = new Insert(source, {
        string: 'hi',
        boolean: true,
        int: 123,
        number: 456.78,
        object: {field: 'value'},
        array: [1, 2, 3],
        emptyArray: []
      });

      assert.lengthOf(query.columns, 7);
      assert.deepEqual(query.columns, ['"string"', '"boolean"', '"int"', '"number"', '"object"', '"array"', '"emptyArray"']);
      assert.lengthOf(query.params, 7);
      assert.deepEqual(query.params, ['hi', true, 123, 456.78, {field: 'value'}, [1, 2, 3], '{}']);
    });
  });

  describe('format', function () {
    it('should return a basic update statement for the specified changes', function () {
      const result = new Insert(source, {field1: 'value1'});
      assert.equal(result.format(), 'INSERT INTO testsource ("field1") VALUES ($1) RETURNING *');
      assert.deepEqual(result.params, ['value1']);
    });

    it('should join fields and values with commas', function () {
      const result = new Insert(source, {field1: 'value1', field2: 2});
      assert.equal(result.format(), 'INSERT INTO testsource ("field1", "field2") VALUES ($1, $2) RETURNING *');
      assert.deepEqual(result.params, ['value1', 2]);
    });

    it('should handle multiple records', function () {
      const result = new Insert(source, [{field1: 'value1', field2: 2}, {field1: 'value2', field2: 3}]);
      assert.equal(result.format(), 'INSERT INTO testsource ("field1", "field2") VALUES ($1, $2), ($3, $4) RETURNING *');
      assert.deepEqual(result.params, ['value1', 2, 'value2', 3]);
    });

    it('should handle multiple records with fields out of order', function () {
      const result = new Insert(source, [{field1: 'value1', field2: 2}, {field2: 3, field1: 'value2'}]);
      assert.equal(result.format(), 'INSERT INTO testsource ("field1", "field2") VALUES ($1, $2), ($3, $4) RETURNING *');
      assert.deepEqual(result.params, ['value1', 2, 'value2', 3]);
    });

    it('should combine keys of partial records', function () {
      const result = new Insert(source, [{field1: 'value1'}, {field2: 'value2'}]);
      assert.equal(result.format(), 'INSERT INTO testsource ("field1", "field2") VALUES ($1, $2), ($3, $4) RETURNING *');
      assert.deepEqual(result.params, ['value1', undefined, undefined, 'value2']);
    });

    it('should handle onConflictIgnore option', function () {
      const result = new Insert(source, {field1: 'value1'}, {onConflictIgnore: true});
      assert.equal(result.format(), 'INSERT INTO testsource ("field1") VALUES ($1) ON CONFLICT DO NOTHING RETURNING *');
      assert.deepEqual(result.params, ['value1']);
    });
  });
});
