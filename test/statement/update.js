'use strict';

const Update = require('../../lib/statement/update');

describe('Update', function () {
  const source = {
    delimitedFullName: 'testsource',
    isPkSearch: () => false
  };

  describe('ctor', function () {
    it('should have defaults', function () {
      const query = new Update(source);

      assert.equal(query.source, 'testsource');
      assert.equal(query.generator, 'generator');
      assert.isTrue(query.only);
      assert.isFalse(query.single);
    });
  });

  describe('format', function () {
    it('should return a basic update statement for the specified changes', function () {
      const result = new Update(source, {field1: 'value1'});
      assert.equal(result.format(), 'UPDATE ONLY testsource SET "field1" = $1 WHERE TRUE RETURNING *');
    });

    it('should accommodate multiple changes', function () {
      const result = new Update(source, {field1: 'value1', field2: 2});
      assert.equal(result.format(), 'UPDATE ONLY testsource SET "field1" = $1, "field2" = $2 WHERE TRUE RETURNING *');
    });

    it('should build a WHERE clause', function () {
      const result = new Update(source, {field1: 'value1'}, {field1: 'value2'});
      assert.equal(result.format(), 'UPDATE ONLY testsource SET "field1" = $1 WHERE "field1" = $2 RETURNING *');
    });

    it('should turn off ONLY', function () {
      const result = new Update(source, {field1: 'value1'}, {}, {only: false});
      assert.equal(result.format(), 'UPDATE testsource SET "field1" = $1 WHERE TRUE RETURNING *');
    });
  });
});
