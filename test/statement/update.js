'use strict';

const Update = require('../../lib/statement/update');

describe('Update', function () {
  const source = {
    delimitedFullName: 'testsource',
    pk: ['id'],
    isPkSearch: () => false,
    columns: ['id', 'field1', 'field2', 'string', 'boolean', 'int', 'number', 'object', 'array', 'emptyArray']
  };

  describe('ctor', function () {
    it('should have defaults', function () {
      const query = new Update(source);

      assert.equal(query.source.delimitedFullName, 'testsource');
      assert.equal(query.generator, 'tableGenerator');
      assert.isFalse(query.only);
      assert.isFalse(query.single);
    });

    it('should apply options', function () {
      const query = new Update(source, {}, {}, {
        build: true,
        decompose: true,
        document: true,
        only: true,
        single: true,
        stream: true,
        fields: ['field1', 'field2']
      });

      assert.equal(query.source.delimitedFullName, 'testsource');
      assert.isTrue(query.build);
      assert.isTrue(query.decompose);
      assert.isTrue(query.document);
      assert.isTrue(query.only);
      assert.isTrue(query.stream);
      assert.sameMembers(query.fields, ['"field1"', '"field2"']);
    });
  });

  describe('format', function () {
    it('should return a basic update statement for the specified changes', function () {
      const result = new Update(source, {field1: 'value1'});
      assert.equal(result.format(), 'UPDATE testsource SET "field1" = $1 WHERE TRUE RETURNING *');
      assert.deepEqual(result.params, ['value1']);
    });

    it('should accommodate multiple changes', function () {
      const result = new Update(source, {field1: 'value1', field2: 2});
      assert.equal(result.format(), 'UPDATE testsource SET "field1" = $1, "field2" = $2 WHERE TRUE RETURNING *');
      assert.deepEqual(result.params, ['value1', 2]);
    });

    it('should ignore nonexistent columns', function () {
      const result = new Update(source, {not_a_field_1: 0, field1: 'value1', field2: 2, not_a_field_2: 3});
      assert.equal(result.format(), 'UPDATE testsource SET "field1" = $1, "field2" = $2 WHERE TRUE RETURNING *');
      assert.deepEqual(result.params, ['value1', 2]);
    });

    it('should build a WHERE clause with criteria', function () {
      const result = new Update(source, {field1: 'value1'}, {field1: 'value2'});
      assert.equal(result.format(), 'UPDATE testsource SET "field1" = $1 WHERE "field1" = $2 RETURNING *');
    });

    it('should build a WHERE clause using the document generator', function () {
      const result = new Update(source, {field1: 'value1'}, {id: 1}, {document: true, generator: 'docGenerator'});
      assert.equal(result.format(), 'UPDATE testsource SET "field1" = $1 WHERE "body" @> $2 RETURNING *');
    });

    it('should build a WHERE clause with a pk criterion and forestall the docGenerator', function () {
      const result = new Update({
        delimitedFullName: 'testsource',
        columns: ['id', 'field1'],
        isPkSearch: () => true,
        pk: 'id'
      }, {field1: 'value1'}, {id: 1}, {generator: 'docGenerator'});
      assert.equal(result.format(), 'UPDATE testsource SET "field1" = $1 WHERE "id" = $2 RETURNING *');
    });

    it('should set ONLY', function () {
      const result = new Update(source, {field1: 'value1'}, {}, {only: true});
      assert.equal(result.format(), 'UPDATE ONLY testsource SET "field1" = $1 WHERE TRUE RETURNING *');
    });

    it('should restrict returned fields', function () {
      const result = new Update(source, {field1: 'value1'}, {field1: 'value2'}, {fields: ['field1', 'field2']});
      assert.equal(result.format(), 'UPDATE testsource SET "field1" = $1 WHERE "field1" = $2 RETURNING "field1", "field2"');
      assert.deepEqual(result.params, ['value1', 'value2']);
    });
  });
});
