'use strict';

const parseKey = require('../../lib/util/parse-key');
const ops = require('../../lib/statement/operations');

describe('parseKey', function () {
  describe('Plain identifiers', function () {
    it('should quote an unquoted plain identifier', function () {
      const result = parseKey('myfield');
      assert.equal(result.rawField, 'myfield');
      assert.equal(result.field, '"myfield"');
    });

    it('should not double-quote a quoted plain identifier', function () {
      const result = parseKey('"my field"');
      assert.equal(result.rawField, 'my field');
      assert.equal(result.field, '"my field"');
    });
  });

  describe('JSON traversal', function () {
    it('should format a shallow JSON path', function () {
      const result = parseKey('json.property');
      assert.equal(result.rawField, 'json');
      assert.equal(result.field, '"json"->>\'property\'');
    });

    it('should format a shallow JSON path with a numeric key', function () {
      const result = parseKey('json.123');
      assert.equal(result.rawField, 'json');
      assert.equal(result.field, '"json"->>\'123\'');
    });

    it('should format a JSON array path', function () {
      const result = parseKey('json[123]');
      assert.equal(result.rawField, 'json');
      assert.equal(result.field, '"json"->>123');
    });

    it('should format a deep JSON path', function () {
      const result = parseKey('json.outer.inner');
      assert.equal(result.rawField, 'json');
      assert.equal(result.field, '"json"#>>\'{outer,inner}\'');
    });

    it('should format a JSON path with a quoted field', function () {
      const result = parseKey('"json field".outer.inner');
      assert.equal(result.rawField, 'json field');
      assert.equal(result.field, '"json field"#>>\'{outer,inner}\'');
    });

    it('should format a JSON path with a quoted field containing special characters', function () {
      const result = parseKey('"json.fiel[d]".outer.inner');
      assert.equal(result.rawField, 'json.fiel[d]');
      assert.equal(result.field, '"json.fiel[d]"#>>\'{outer,inner}\'');
    });

    it('should format a deep JSON path with numeric keys', function () {
      const result = parseKey('json.123.456');
      assert.equal(result.rawField, 'json');
      assert.equal(result.field, '"json"#>>\'{123,456}\'');
    });

    it('should format mixed JSON paths', function () {
      const result = parseKey('json.array[1].field.array[2]');
      assert.equal(result.rawField, 'json');
      assert.equal(result.field, '"json"#>>\'{array,1,field,array,2}\'');
    });
  });

  describe('operation appendices', function () {
    it('should default to equivalence', function () {
      const result = parseKey('myfield', ops);
      assert.equal(result.rawField, 'myfield');
      assert.equal(result.field, '"myfield"');
      assert.equal(result.appended.operator, '=');
      assert.isUndefined(result.mutator);
    });

    it('should get the operation details for an unquoted identifier', function () {
      const result = parseKey('myfield <=', ops);
      assert.equal(result.rawField, 'myfield');
      assert.equal(result.field, '"myfield"');
      assert.equal(result.appended.operator, '<=');
      assert.isUndefined(result.mutator);
    });

    it('should get the operation details for a quoted identifier', function () {
      const result = parseKey('"my field" <=', ops);
      assert.equal(result.rawField, 'my field');
      assert.equal(result.field, '"my field"');
      assert.equal(result.appended.operator, '<=');
      assert.isUndefined(result.mutator);
    });

    it('should allow any amount of whitespace', function () {
      const result = parseKey(' \r\n \t myfield  \r\n  \t  \t <= \r\n\t', ops);
      assert.equal(result.rawField, 'myfield', ops);
      assert.equal(result.field, '"myfield"');
      assert.equal(result.appended.operator, '<=');
      assert.isUndefined(result.mutator);
    });

    it('should get the appropriate mutator', function () {
      const result = parseKey('"my field" @>', ops);
      assert.equal(result.rawField, 'my field');
      assert.equal(result.field, '"my field"');
      assert.equal(result.appended.operator, '@>');
      assert.equal(typeof result.appended.mutator, 'function');
      assert.deepEqual(result.appended.mutator({value: ['hi'], params: [], offset: 1}), {
        offset: 1,
        value: '$1',
        params: ['{hi}']
      });
    });

    it('should get operations for a shallow JSON path', function () {
      const result = parseKey('json.key <=', ops);
      assert.equal(result.rawField, 'json');
      assert.equal(result.field, '"json"->>\'key\'');
      assert.equal(result.appended.operator, '<=');
      assert.isUndefined(result.mutator);
    });

    it('should get operations for a deep JSON path', function () {
      const result = parseKey('json.outer.inner <=', ops);
      assert.equal(result.rawField, 'json');
      assert.equal(result.field, '"json"#>>\'{outer,inner}\'');
      assert.equal(result.appended.operator, '<=');
      assert.isUndefined(result.mutator);
    });

    it('should get operations for a JSON array', function () {
      const result = parseKey('json[1] <=', ops);
      assert.equal(result.rawField, 'json');
      assert.equal(result.field, '"json"->>1');
      assert.equal(result.appended.operator, '<=');
      assert.isUndefined(result.mutator);
    });

    it('should match > properly', function () {
      const result = parseKey('field >', ops);
      assert.equal(result.rawField, 'field');
      assert.equal(result.field, '"field"');
      assert.equal(result.appended.operator, '>');
      assert.isUndefined(result.mutator);
    });

    it('should match >= properly', function () {
      const result = parseKey('field >=', ops);
      assert.equal(result.rawField, 'field');
      assert.equal(result.field, '"field"');
      assert.equal(result.appended.operator, '>=');
      assert.isUndefined(result.mutator);
    });

    it('should match the longest possible operator', function () {
      const result = parseKey('field ~~*', ops); // ~ and ~* are also operators
      assert.equal(result.rawField, 'field');
      assert.equal(result.field, '"field"');
      assert.equal(result.appended.operator, 'ILIKE');
      assert.isUndefined(result.mutator);
    });

    it('should ignore the case of LIKE and similar operators', function () {
      const result = parseKey('field LikE', ops);
      assert.equal(result.rawField, 'field');
      assert.equal(result.field, '"field"');
      assert.equal(result.appended.operator, 'LIKE');
      assert.isUndefined(result.mutator);
    });

    it('should not clobber a field with an operator in the name', function () {
      const result = parseKey('is_field is', ops);
      assert.equal(result.rawField, 'is_field');
      assert.equal(result.field, '"is_field"');
      assert.equal(result.appended.operator, 'IS');
      assert.isUndefined(result.mutator);
    });

    it('should not clobber a quoted field with an operator in the name', function () {
      const result = parseKey('"this is a field" is', ops);
      assert.equal(result.rawField, 'this is a field');
      assert.equal(result.field, '"this is a field"');
      assert.equal(result.appended.operator, 'IS');
      assert.isUndefined(result.mutator);
    });
  });

  describe('casting', function () {
    it('should cast fields without an operator', function () {
      const result = parseKey('field::text', ops);
      assert.equal(result.rawField, 'field');
      assert.equal(result.field, '"field"::text');
      assert.equal(result.appended.operator, '=');
      assert.isUndefined(result.mutator);
    });

    it('should cast fields', function () {
      const result = parseKey('field::text LIKE', ops);
      assert.equal(result.rawField, 'field');
      assert.equal(result.field, '"field"::text');
      assert.equal(result.appended.operator, 'LIKE');
      assert.isUndefined(result.mutator);
    });

    it('should cast fields with shallow JSON paths', function () {
      const result = parseKey('field.element::boolean LIKE', ops);
      assert.equal(result.rawField, 'field');
      assert.equal(result.field, '("field"->>\'element\')::boolean');
      assert.equal(result.appended.operator, 'LIKE');
      assert.isUndefined(result.mutator);
    });

    it('should cast fields with deep JSON paths', function () {
      const result = parseKey('field.one.two::boolean LIKE', ops);
      assert.equal(result.rawField, 'field');
      assert.equal(result.field, '("field"#>>\'{one,two}\')::boolean');
      assert.equal(result.appended.operator, 'LIKE');
      assert.isUndefined(result.mutator);
    });

    it('should cast fields with JSON arrays', function () {
      const result = parseKey('field[123]::boolean LIKE', ops);
      assert.equal(result.rawField, 'field');
      assert.equal(result.field, '("field"->>123)::boolean');
      assert.equal(result.appended.operator, 'LIKE');
      assert.isUndefined(result.mutator);
    });

    it('should format mixed JSON paths', function () {
      const result = parseKey('json.array[1].field.array[2]::boolean LIKE', ops);
      assert.equal(result.rawField, 'json');
      assert.equal(result.field, '("json"#>>\'{array,1,field,array,2}\')::boolean');
      assert.equal(result.appended.operator, 'LIKE');
      assert.isUndefined(result.mutator);
    });

    it('should cast quoted fields without an operator', function () {
      const result = parseKey('"field"::text', ops);
      assert.equal(result.rawField, 'field');
      assert.equal(result.field, '"field"::text');
      assert.equal(result.appended.operator, '=');
      assert.isUndefined(result.mutator);
    });

    it('should cast quoted fields', function () {
      const result = parseKey('"field"::text LIKE', ops);
      assert.equal(result.rawField, 'field');
      assert.equal(result.field, '"field"::text');
      assert.equal(result.appended.operator, 'LIKE');
      assert.isUndefined(result.mutator);
    });

    it('should cast quoted fields with JSON operations', function () {
      const result = parseKey('"field".element::boolean LIKE', ops);
      assert.equal(result.rawField, 'field');
      assert.equal(result.field, '("field"->>\'element\')::boolean');
      assert.equal(result.appended.operator, 'LIKE');
      assert.isUndefined(result.mutator);
    });

    it('should cast quoted fields with deep JSON paths', function () {
      const result = parseKey('"field".one.two::boolean LIKE', ops);
      assert.equal(result.rawField, 'field');
      assert.equal(result.field, '("field"#>>\'{one,two}\')::boolean');
      assert.equal(result.appended.operator, 'LIKE');
      assert.isUndefined(result.mutator);
    });

    it('should cast quoted fields with JSON arrays', function () {
      const result = parseKey('"field"[123]::boolean LIKE', ops);
      assert.equal(result.rawField, 'field');
      assert.equal(result.field, '("field"->>123)::boolean');
      assert.equal(result.appended.operator, 'LIKE');
      assert.isUndefined(result.mutator);
    });

    it('should format quoted fields with mixed JSON paths', function () {
      const result = parseKey('"json".array[1].field.array[2]::boolean LIKE', ops);
      assert.equal(result.rawField, 'json');
      assert.equal(result.field, '("json"#>>\'{array,1,field,array,2}\')::boolean');
      assert.equal(result.appended.operator, 'LIKE');
      assert.isUndefined(result.mutator);
    });
  });
});
