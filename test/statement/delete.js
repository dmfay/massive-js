'use strict';

const Delete = require('../../lib/statement/delete');

describe('Delete', function () {
  const source = {
    delimitedFullName: 'testsource',
    isPkSearch: () => false
  };

  describe('ctor', function () {
    it('should have defaults', function () {
      const query = new Delete(source);

      assert.equal(query.source, 'testsource');
      assert.equal(query.generator, 'generator');
      assert.isFalse(query.only);
      assert.isFalse(query.single);
    });

    it('should apply options', function () {
      const query = new Delete(source, {}, {build: true});

      assert.equal(query.source, 'testsource');
      assert.isTrue(query.build);
    });
  });

  describe('format', function () {
    it('should return a basic delete statement for the specified criteria', function () {
      const result = new Delete(source);
      assert.equal(result.format(), 'DELETE FROM testsource WHERE TRUE RETURNING *');
    });

    it('should build a WHERE clause with criteria', function () {
      const result = new Delete(source, {field1: 'value1'});
      assert.equal(result.format(), 'DELETE FROM testsource WHERE "field1" = $1 RETURNING *');
    });

    it('should build a WHERE clause with a pk', function () {
      const result = new Delete({
        delimitedFullName: 'testsource',
        isPkSearch: () => true,
        pk: 'id'
      }, 1);
      assert.equal(result.format(), 'DELETE FROM testsource WHERE "id" = $1 RETURNING *');
    });

    it('should set ONLY', function () {
      const result = new Delete(source, {field1: 'value1'}, {only: true});
      assert.equal(result.format(), 'DELETE FROM ONLY testsource WHERE "field1" = $1 RETURNING *');
    });
  });
});
