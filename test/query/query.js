'use strict';

const Query = require('../../lib/query/query');

describe('Query', function () {
  const source = {
    delimitedFullName: 'testsource'
  };

  describe('ctor', function () {
    it('should have defaults', function () {
      const query = new Query(source);

      assert.equal(query.source, 'testsource');
      assert.equal(query.columns, '*');
      assert.equal(query.generator, 'generator');
      assert.isFalse(query.only);
      assert.isFalse(query.single);
      assert.equal(query.order, ' ORDER BY 1');
    });
  });

  describe('format', function () {
    it('should join arrays', function () {
      const result = new Query(source, {}, {columns: ['col1', 'col2']});
      assert.equal(result.format(), 'SELECT col1,col2 FROM testsource WHERE TRUE ORDER BY 1');
    });

    it('should leave anything else alone', function () {
      const result = new Query(source, {}, {columns: 'count(1)'});
      assert.equal(result.format(), 'SELECT count(1) FROM testsource WHERE TRUE ORDER BY 1');
    });

    it('should add an offset', function () {
      const result = new Query(source, {}, {offset: 10});
      assert.equal(result.format(), 'SELECT * FROM testsource WHERE TRUE ORDER BY 1 OFFSET 10');
    });

    it('should limit single queries to one result', function () {
      const result = new Query(source, {}, {single: true});
      assert.equal(result.format(), 'SELECT * FROM testsource WHERE TRUE ORDER BY 1 LIMIT 1');
    });

    it('should add a limit', function () {
      const result = new Query(source, {}, {limit: 10});
      assert.equal(result.format(), 'SELECT * FROM testsource WHERE TRUE ORDER BY 1 LIMIT 10');
    });

    it('should add both offset and limit', function () {
      const result = new Query(source, {}, {offset: 10, limit: 10});
      assert.equal(result.format(), 'SELECT * FROM testsource WHERE TRUE ORDER BY 1 OFFSET 10 LIMIT 10');
    });
  });
});
