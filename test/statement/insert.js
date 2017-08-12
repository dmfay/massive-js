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
  });

  describe('format', function () {
    it('should return a basic update statement for the specified changes', function () {
      const result = new Insert(source, {field1: 'value1'});
      assert.equal(result.format(), 'INSERT INTO testsource ("field1") VALUES ($1) RETURNING *');
    });

    it('should join fields and values with commas', function () {
      const result = new Insert(source, {field1: 'value1', field2: 2});
      assert.equal(result.format(), 'INSERT INTO testsource ("field1", "field2") VALUES ($1, $2) RETURNING *');
    });

    it('should handle multiple records', function () {
      const result = new Insert(source, [{field1: 'value1', field2: 2}, {field1: 'value2', field2: 3}]);
      assert.equal(result.format(), 'INSERT INTO testsource ("field1", "field2") VALUES ($1, $2), ($3, $4) RETURNING *');
    });

    it('should handle onConflictIgnore option', function () {
      const result = new Insert(source, {field1: 'value1'}, {onConflictIgnore: true});
      assert.equal(result.format(), 'INSERT INTO testsource ("field1") VALUES ($1) ON CONFLICT DO NOTHING RETURNING *');
    });


  });
});
