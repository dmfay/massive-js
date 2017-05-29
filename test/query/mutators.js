'use strict';

const mutators = require('../../lib/query/mutators');
const ops = require('../../lib/query/operations');

describe('mutators', function () {
  describe('buildBetween', function () {
    it('builds a BETWEEN predicate', function () {
      const condition = mutators.buildBetween({
        offset: 1,
        value: [1, 100],
        params: []
      });

      assert.deepEqual(condition, {
        offset: 3,
        params: [1, 100],
        value: '$1 AND $2'
      });
    });
  });

  describe('buildIn', function () {
    it('builds an IN list', function () {
      const condition = mutators.buildIn({
        operation: ops('='),
        offset: 1,
        value: [1, 2, 3],
        params: []
      });

      assert.equal(condition.operation.key, '=');
      assert.equal(condition.operation.operator, 'IN');
      assert.equal(condition.offset, 4);
      assert.deepEqual(condition.params, [1, 2, 3]);
      assert.equal(condition.value, '($1,$2,$3)');
    });

    it('builds a NOT IN list', function () {
      const condition = mutators.buildIn({
        operation: ops('<>'),
        offset: 1,
        value: [1, 2, 3],
        params: []
      });

      assert.equal(condition.operation.key, '<>');
      assert.equal(condition.operation.operator, 'NOT IN');
      assert.equal(condition.offset, 4);
      assert.deepEqual(condition.params, [1, 2, 3]);
      assert.equal(condition.value, '($1,$2,$3)');
    });
  });

  describe('buildIs', function () {
    it('interpolates values with IS', function () {
      const condition = mutators.buildIs({
        operation: ops('='),
        offset: 1,
        value: null,
        params: []
      });

      assert.equal(condition.operation.key, '=');
      assert.equal(condition.operation.operator, 'IS');
      assert.equal(condition.offset, 1);
      assert.deepEqual(condition.params, []);
      assert.isNull(condition.value);
    });

    it('interpolates values with NOT IS', function () {
      const condition = mutators.buildIs({
        operation: ops('<>'),
        offset: 1,
        value: true,
        params: []
      });

      assert.equal(condition.operation.key, '<>');
      assert.equal(condition.operation.operator, 'IS NOT');
      assert.equal(condition.offset, 1);
      assert.deepEqual(condition.params, []);
      assert.isTrue(condition.value);
    });
  });

  describe('equality', function () {
    it('passes off arrays to buildIn', function () {
      const condition = mutators.equality({
        operation: ops('<>'),
        offset: 1,
        value: [1, 2, 3],
        params: []
      });

      assert.equal(condition.operation.key, '<>');
      assert.equal(condition.operation.operator, 'NOT IN');
      assert.equal(condition.offset, 4);
      assert.deepEqual(condition.params, [1, 2, 3]);
      assert.equal(condition.value, '($1,$2,$3)');
    });

    it('passes nulls and booleans to buildIs', function () {
      assert.equal(mutators.equality({
        operation: ops('='),
        offset: 1,
        value: null,
        params: []
      }).operation.operator, 'IS');

      assert.equal(mutators.equality({
        operation: ops('='),
        offset: 1,
        value: true,
        params: []
      }).operation.operator, 'IS');

      assert.equal(mutators.equality({
        operation: ops('='),
        offset: 1,
        value: false,
        params: []
      }).operation.operator, 'IS');
    });

    it('prepares parameters', function () {
      const condition = mutators.equality({
        operation: ops('='),
        offset: 1,
        value: 123,
        params: []
      });

      assert.equal(condition.operation.key, '=');
      assert.equal(condition.operation.operator, '=');
      assert.equal(condition.offset, 1);
      assert.deepEqual(condition.params, [123]);
      assert.equal(condition.value, '$1');
    });
  });

  describe('literalizeArray', function () {
    it('transforms arrays into Postgres syntax', function () {
      const condition = {
        offset: 1,
        value: ['one', 'two', 'three'],
        params: []
      };

      assert.deepEqual(mutators.literalizeArray(condition), {
        offset: 1,
        params: ['{one,two,three}'],
        value: '$1'
      });
    });

    it('leaves non-array values alone', function () {
      const condition = {
        offset: 1,
        value: 'hi',
        params: []
      };

      assert.deepEqual(mutators.literalizeArray(condition), {
        offset: 1,
        params: ['hi'],
        value: '$1'
      });
    });

    it('sanitizes string values', function () {
      const condition = {
        offset: 1,
        value: ['{one}', 'two three', 'four,five', '"six"', '\\seven', '', 'null'],
        params: []
      };

      assert.deepEqual(mutators.literalizeArray(condition), {
        offset: 1,
        params: ['{"{one}","two three","four,five","\\\"six\\\"","\\\\seven","","null"}'],
        value: '$1'
      });
    });

    it('does nothing to non-string values', function () {
      const condition = {
        offset: 1,
        value: [1, true, null, 1.5],
        params: []
      };

      assert.deepEqual(mutators.literalizeArray(condition), {
        offset: 1,
        params: ['{1,true,null,1.5}'],
        value: '$1'
      });
    });
  });
});
