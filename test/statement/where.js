'use strict';

const where = require('../../lib/statement/where');
const ops = require('../../lib/statement/operations');

describe('WHERE clause generation', function () {
  describe('module', function () {
    it('should return a safe value for empty criteria', function () {
      const result = where({});
      assert.equal(result.conditions, 'TRUE');
      assert.equal(result.params.length, 0);
    });

    it('should create basic criteria', function () {
      const result = where({field: 'value'});
      assert.equal(result.conditions, '"field" = $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], 'value');
    });

    it('should AND together predicates', function () {
      const result = where({field1: 'value1', field2: 'value2'});
      assert.equal(result.conditions, '"field1" = $1 AND "field2" = $2');
      assert.equal(result.params.length, 2);
      assert.equal(result.params[0], 'value1');
      assert.equal(result.params[1], 'value2');
    });

    it('should return conditions and parameters', function () {
      const result = where({field1: 'value1', field2: 'value2'});

      assert.equal(result.conditions, '"field1" = $1 AND "field2" = $2');
      assert.equal(result.params.length, 2);
      assert.equal(result.params[0], 'value1');
      assert.equal(result.params[1], 'value2');
    });

    describe('JSON value formatting', function () {
      it('should stringify numbers', function () {
        const result = where({'json.field': 123});

        assert.equal(result.conditions, '"json"->>\'field\' = $1');
        assert.lengthOf(result.params, 1);
        assert.equal(result.params[0], '123');
        assert.typeOf(result.params[0], 'string');
      });

      it('should stringify booleans', function () {
        const result = where({'json.field': true});

        assert.equal(result.conditions, '"json"->>\'field\' = $1');
        assert.lengthOf(result.params, 1);
        assert.equal(result.params[0], 'true');
        assert.typeOf(result.params[0], 'string');
      });

      it('should stringify dates', function () {
        const date = new Date();
        const result = where({'json.field': date});

        assert.equal(result.conditions, '"json"->>\'field\' = $1');
        assert.lengthOf(result.params, 1);
        assert.equal(result.params[0], date.toString());
        assert.typeOf(result.params[0], 'string');
      });

      it('should stringify individual items in arrays', function () {
        const result = where({'json.field': [1, 2, 3]});

        assert.equal(result.conditions, '"json"->>\'field\' IN ($1,$2,$3)');
        assert.lengthOf(result.params, 3);
        assert.deepEqual(result.params, ['1', '2', '3']);
        assert.typeOf(result.params[0], 'string');
      });

      it('should not stringify nulls', function () {
        const result = where({'json.field': null});

        assert.equal(result.conditions, '"json"->>\'field\' IS null');
        assert.lengthOf(result.params, 0);
      });
    });

    describe('with subgroups', function () {
      it('should encapsulate and OR together subgroups', function () {
        const result = where({
          or: [{
              field1: 'value1'
            }, {
              field2: 'value2', field3: 'value3'
            }, {
              field4: 'value4'
            }]
          }
        );

        assert.equal(result.conditions, '(("field1" = $1) OR ("field2" = $2 AND "field3" = $3) OR ("field4" = $4))');
        assert.equal(result.params.length, 4);
        assert.equal(result.params[0], 'value1');
        assert.equal(result.params[1], 'value2');
        assert.equal(result.params[2], 'value3');
        assert.equal(result.params[3], 'value4');
      });

      it('should not pollute other fields', function () {
        const result = where({
          or: [{field1: 'value1'}, {field2: 'value2'}],
          field3: 'value3'
        });

        assert.equal(result.conditions, '(("field1" = $1) OR ("field2" = $2)) AND "field3" = $3');
        assert.equal(result.params.length, 3);
        assert.equal(result.params[0], 'value1');
        assert.equal(result.params[1], 'value2');
        assert.equal(result.params[2], 'value3');
      });

      it('should return a usable predicate if only given one subgroup', function () {
        const result = where({or: [{field1: 'value1'}]});

        assert.equal(result.conditions, '(("field1" = $1))');
        assert.equal(result.params.length, 1);
        assert.equal(result.params[0], 'value1');
      });

      it('recurses', function () {
        const result = where({
          or: [{
            field1: 'value1',
            or: [{
              field2: 'value4'
            }, {
              field3: 'value5'
            }]
          }, {
            field2: 'value2',
            field3: 'value3'
          }]
        });

        assert.equal(result.conditions, '(("field1" = $1 AND (("field2" = $2) OR ("field3" = $3))) OR ("field2" = $4 AND "field3" = $5))');
        assert.equal(result.params.length, 5);
        assert.equal(result.params[0], 'value1');
        assert.equal(result.params[1], 'value4');
        assert.equal(result.params[2], 'value5');
        assert.equal(result.params[3], 'value2');
        assert.equal(result.params[4], 'value3');
      });
    });
  });

  describe('getCondition', function () {
    describe('Plain identifiers', function () {
      it('should quote an unquoted plain identifier', function () {
        const result = where.getCondition('myfield');
        assert.equal(result.rawField, 'myfield');
        assert.equal(result.field, '"myfield"');
      });

      it('should not double-quote a quoted plain identifier', function () {
        const result = where.getCondition('"my field"');
        assert.equal(result.rawField, 'my field');
        assert.equal(result.field, '"my field"');
      });
    });

    describe('JSON traversal', function () {
      it('should format a shallow JSON path', function () {
        const result = where.getCondition('json.property');
        assert.equal(result.rawField, 'json');
        assert.equal(result.field, '"json"->>\'property\'');
      });

      it('should format a shallow JSON path with a numeric key', function () {
        const result = where.getCondition('json.123');
        assert.equal(result.rawField, 'json');
        assert.equal(result.field, '"json"->>\'123\'');
      });

      it('should format a JSON array path', function () {
        const result = where.getCondition('json[123]');
        assert.equal(result.rawField, 'json');
        assert.equal(result.field, '"json"->>123');
      });

      it('should format a deep JSON path', function () {
        const result = where.getCondition('json.outer.inner');
        assert.equal(result.rawField, 'json');
        assert.equal(result.field, '"json"#>>\'{outer,inner}\'');
      });

      it('should format a JSON path with a quoted field', function () {
        const result = where.getCondition('"json field".outer.inner');
        assert.equal(result.rawField, 'json field');
        assert.equal(result.field, '"json field"#>>\'{outer,inner}\'');
      });

      it('should format a deep JSON path with numeric keys', function () {
        const result = where.getCondition('json.123.456');
        assert.equal(result.rawField, 'json');
        assert.equal(result.field, '"json"#>>\'{123,456}\'');
      });

      it('should format mixed JSON paths', function () {
        const result = where.getCondition('json.array[1].field.array[2]');
        assert.equal(result.rawField, 'json');
        assert.equal(result.field, '"json"#>>\'{array,1,field,array,2}\'');
      });
    });

    describe('operations', function () {
      it('should default to equivalence', function () {
        const result = where.getCondition('myfield');
        assert.equal(result.rawField, 'myfield');
        assert.equal(result.field, '"myfield"');
        assert.equal(result.operation.operator, '=');
        assert.equal(result.mutator, undefined);
      });

      it('should get the operation details for an unquoted identifier', function () {
        const result = where.getCondition('myfield <=');
        assert.equal(result.rawField, 'myfield');
        assert.equal(result.field, '"myfield"');
        assert.equal(result.operation.operator, '<=');
        assert.equal(result.mutator, undefined);
      });

      it('should get the operation details for a quoted identifier', function () {
        const result = where.getCondition('"my field" <=');
        assert.equal(result.rawField, 'my field');
        assert.equal(result.field, '"my field"');
        assert.equal(result.operation.operator, '<=');
        assert.equal(result.mutator, undefined);
      });

      it('should allow any amount of whitespace', function () {
        const result = where.getCondition(' \r\n \t myfield  \r\n  \t  \t <= \r\n\t');
        assert.equal(result.rawField, 'myfield');
        assert.equal(result.field, '"myfield"');
        assert.equal(result.operation.operator, '<=');
        assert.equal(result.mutator, undefined);
      });

      it('should get the appropriate mutator', function () {
        const result = where.getCondition('"my field" @>');
        assert.equal(result.rawField, 'my field');
        assert.equal(result.field, '"my field"');
        assert.equal(result.operation.operator, '@>');
        assert.equal(typeof result.operation.mutator, 'function');
        assert.deepEqual(result.operation.mutator({value: ['hi'], params: [], offset: 1}), {
          offset: 1,
          value: '$1',
          params: ['{hi}']
        });
      });

      it('should get operations for a shallow JSON path', function () {
        const result = where.getCondition('json.key <=');
        assert.equal(result.rawField, 'json');
        assert.equal(result.field, '"json"->>\'key\'');
        assert.equal(result.operation.operator, '<=');
        assert.equal(result.mutator, undefined);
      });

      it('should get operations for a deep JSON path', function () {
        const result = where.getCondition('json.outer.inner <=');
        assert.equal(result.rawField, 'json');
        assert.equal(result.field, '"json"#>>\'{outer,inner}\'');
        assert.equal(result.operation.operator, '<=');
        assert.equal(result.mutator, undefined);
      });

      it('should get operations for a JSON array', function () {
        const result = where.getCondition('json[1] <=');
        assert.equal(result.rawField, 'json');
        assert.equal(result.field, '"json"->>1');
        assert.equal(result.operation.operator, '<=');
        assert.equal(result.mutator, undefined);
      });

      it('should match > properly', function () {
        var result = where.getCondition('field >');
        assert.equal(result.rawField, 'field');
        assert.equal(result.field, '"field"');
        assert.equal(result.operation.operator, '>');
        assert.equal(result.mutator, undefined);
      });

      it('should match >= properly', function () {
        var result = where.getCondition('field >=');
        assert.equal(result.rawField, 'field');
        assert.equal(result.field, '"field"');
        assert.equal(result.operation.operator, '>=');
        assert.equal(result.mutator, undefined);
      });

      it('should match the longest possible operator', function () {
        const result = where.getCondition('field ~~*'); // ~ and ~* are also operators
        assert.equal(result.rawField, 'field');
        assert.equal(result.field, '"field"');
        assert.equal(result.operation.operator, 'ILIKE');
        assert.equal(result.mutator, undefined);
      });

      it('should ignore the case of LIKE and similar operators', function () {
        const result = where.getCondition('field LikE');
        assert.equal(result.rawField, 'field');
        assert.equal(result.field, '"field"');
        assert.equal(result.operation.operator, 'LIKE');
        assert.equal(result.mutator, undefined);
      });

      it('should not clobber a field with an operator in the name', function () {
        var result = where.getCondition('is_field is');
        assert.equal(result.rawField, 'is_field');
        assert.equal(result.field, '"is_field"');
        assert.equal(result.operation.operator, 'IS');
        assert.equal(result.mutator, undefined);
      });

      it('should not clobber a quoted field with an operator in the name', function () {
        var result = where.getCondition('"this is a field" is');
        assert.equal(result.rawField, 'this is a field');
        assert.equal(result.field, '"this is a field"');
        assert.equal(result.operation.operator, 'IS');
        assert.equal(result.mutator, undefined);
      });
    });

    describe('casting', function () {
      it('should cast fields without an operator', function () {
        var result = where.getCondition('field::text');
        assert.equal(result.rawField, 'field');
        assert.equal(result.field, '"field"::text');
        assert.equal(result.operation.operator, '=');
        assert.equal(result.mutator, undefined);
      });

      it('should cast fields', function () {
        const result = where.getCondition('field::text LIKE');
        assert.equal(result.rawField, 'field');
        assert.equal(result.field, '"field"::text');
        assert.equal(result.operation.operator, 'LIKE');
        assert.equal(result.mutator, undefined);
      });

      it('should cast fields with shallow JSON paths', function () {
        var result = where.getCondition('field.element::boolean LIKE');
        assert.equal(result.rawField, 'field');
        assert.equal(result.field, '("field"->>\'element\')::boolean');
        assert.equal(result.operation.operator, 'LIKE');
        assert.equal(result.mutator, undefined);
      });

      it('should cast fields with deep JSON paths', function () {
        var result = where.getCondition('field.one.two::boolean LIKE');
        assert.equal(result.rawField, 'field');
        assert.equal(result.field, '("field"#>>\'{one,two}\')::boolean');
        assert.equal(result.operation.operator, 'LIKE');
        assert.equal(result.mutator, undefined);
      });

      it('should cast fields with JSON arrays', function () {
        var result = where.getCondition('field[123]::boolean LIKE');
        assert.equal(result.rawField, 'field');
        assert.equal(result.field, '("field"->>123)::boolean');
        assert.equal(result.operation.operator, 'LIKE');
        assert.equal(result.mutator, undefined);
      });

      it('should format mixed JSON paths', function () {
        const result = where.getCondition('json.array[1].field.array[2]::boolean LIKE');
        assert.equal(result.rawField, 'json');
        assert.equal(result.field, '("json"#>>\'{array,1,field,array,2}\')::boolean');
        assert.equal(result.operation.operator, 'LIKE');
        assert.equal(result.mutator, undefined);
      });

      it('should cast quoted fields without an operator', function () {
        var result = where.getCondition('"field"::text');
        assert.equal(result.rawField, 'field');
        assert.equal(result.field, '"field"::text');
        assert.equal(result.operation.operator, '=');
        assert.equal(result.mutator, undefined);
      });

      it('should cast quoted fields', function () {
        const result = where.getCondition('"field"::text LIKE');
        assert.equal(result.rawField, 'field');
        assert.equal(result.field, '"field"::text');
        assert.equal(result.operation.operator, 'LIKE');
        assert.equal(result.mutator, undefined);
      });

      it('should cast quoted fields with JSON operations', function () {
        var result = where.getCondition('"field".element::boolean LIKE');
        assert.equal(result.rawField, 'field');
        assert.equal(result.field, '("field"->>\'element\')::boolean');
        assert.equal(result.operation.operator, 'LIKE');
        assert.equal(result.mutator, undefined);
      });

      it('should cast quoted fields with deep JSON paths', function () {
        var result = where.getCondition('"field".one.two::boolean LIKE');
        assert.equal(result.rawField, 'field');
        assert.equal(result.field, '("field"#>>\'{one,two}\')::boolean');
        assert.equal(result.operation.operator, 'LIKE');
        assert.equal(result.mutator, undefined);
      });

      it('should cast quoted fields with JSON arrays', function () {
        var result = where.getCondition('"field"[123]::boolean LIKE');
        assert.equal(result.rawField, 'field');
        assert.equal(result.field, '("field"->>123)::boolean');
        assert.equal(result.operation.operator, 'LIKE');
        assert.equal(result.mutator, undefined);
      });

      it('should format quoted fields with mixed JSON paths', function () {
        const result = where.getCondition('"json".array[1].field.array[2]::boolean LIKE');
        assert.equal(result.rawField, 'json');
        assert.equal(result.field, '("json"#>>\'{array,1,field,array,2}\')::boolean');
        assert.equal(result.operation.operator, 'LIKE');
        assert.equal(result.mutator, undefined);
      });
    });
  });

  describe('generator', function () {
    it('should build an equality predicate', function () {
      const condition = {field: '"field"', operation: ops('='), value: 'value', offset: 1, params: []};
      const result = where.generator(condition);
      assert.equal(result.predicate, '"field" = $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], 'value');
    });

    it('should build a BETWEEN predicate', function () {
      const condition = {field: '"field"', operation: ops('between'), value: [1, 100], offset: 1, params: []};
      const result = where.generator(condition);
      assert.equal(result.predicate, '"field" BETWEEN $1 AND $2');
      assert.equal(result.params.length, 2);
      assert.equal(result.params[0], 1);
      assert.equal(result.params[1], 100);
    });

    it('should interpolate nulls directly', function () {
      const condition = {field: '"field"', operation: ops('<>'), value: null, offset: 1, params: []};
      const result = where.generator(condition);
      assert.equal(result.predicate, '"field" IS NOT null');
      assert.equal(result.params.length, 0);
    });

    it('should interpolate booleans directly', function () {
      const condition = {field: '"field"', operation: ops('='), value: false, offset: 1, params: []};
      const result = where.generator(condition);
      assert.equal(result.predicate, '"field" IS false');
      assert.equal(result.params.length, 0);
    });

    it('should accept IS NOT explicitly', function () {
      const condition = {field: '"field"', operation: ops('is not'), value: null, offset: 1, params: []};
      const result = where.generator(condition);
      assert.equal(result.predicate, '"field" IS NOT null');
      assert.equal(result.params.length, 0);
    });

    it('should apply operation mutators', function () {
      const condition = {
        field: '"field"',
        operation: ops('@>'),
        value: ['value'],
        offset: 1,
        params: []
      };
      const result = where.generator(condition);
      assert.equal(result.predicate, '"field" @> $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], '{value}');
    });

    it('should create IN clauses for array parameters', function () {
      const condition = {field: '"field"', operation: ops('='), value: ['value1', 'value2'], offset: 1, params: []};
      const result = where.generator(condition);
      assert.equal(result.predicate, '"field" IN ($1,$2)');
      assert.equal(result.params.length, 2);
      assert.equal(result.params[0], 'value1');
      assert.equal(result.params[1], 'value2');
    });
  });

  describe('docGenerator', function () {
    it('should build deep traversals', function () {
      const obj = {field: [{one: 'two'}]};
      const condition = {rawField: 'field', operation: ops('='), value: [{one: 'two'}], offset: 1, params: []};
      const result = where.docGenerator(condition, obj);
      assert.equal(result.predicate, '"body" @> $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], JSON.stringify(obj));
    });

    it('should create IS comparison predicate', function () {
      const condition = {rawField: 'field', operation: ops('is'), value: true, offset: 1, params: []};
      const result = where.docGenerator(condition, {'field is': true});
      assert.equal(result.predicate, '("body" ->> \'field\') IS true');
      assert.equal(result.params.length, 0);
    });

    it('should build an equality predicate using the JSON contains op', function () {
      const condition = {rawField: 'field', operation: ops('='), value: 'value', offset: 1, params: []};
      const result = where.docGenerator(condition, {field: 'value'});
      assert.equal(result.predicate, '"body" @> $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], JSON.stringify({field: 'value'}));
    });

    it('should build a non-equality predicate', function () {
      const condition = {rawField: 'field', operation: ops('<>'), value: 'value', offset: 1, params: []};
      const result = where.docGenerator(condition, {'field <>': 'value'});
      assert.equal(result.predicate, '("body" ->> \'field\') <> $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], 'value');
    });

    it('should cast booleans in non-equality predicates', function () {
      const condition = {rawField: 'field', operation: ops('<>'), value: true, offset: 1, params: []};
      const result = where.docGenerator(condition, {'field <>': true});
      assert.equal(result.predicate, '("body" ->> \'field\')::boolean <> true');
      assert.equal(result.params.length, 0);
    });

    it('should cast numbers in non-equality predicates', function () {
      const condition = {rawField: 'field', operation: ops('<>'), value: 123.45, offset: 1, params: []};
      const result = where.docGenerator(condition, {'field <>': 123.45});
      assert.equal(result.predicate, '("body" ->> \'field\')::decimal <> 123.45');
      assert.equal(result.params.length, 0);
    });

    it('should cast dates in non-equality predicates', function () {
      const date = new Date();
      const condition = {rawField: 'field', operation: ops('<>'), value: date, offset: 1, params: []};
      const result = where.docGenerator(condition, {'field <>': date});
      assert.equal(result.predicate, '("body" ->> \'field\')::timestamp <> $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], date);
    });

    it('should create IN clauses for array parameters', function () {
      const condition = {rawField: 'field', operation: ops('='), value: ['value1', 'value2'], offset: 1, params: []};
      const result = where.docGenerator(condition, {field: ['value1', 'value2']});
      assert.equal(result.predicate, '("body" ->> \'field\') IN ($1,$2)');
      assert.equal(result.params.length, 2);
      assert.equal(result.params[0], 'value1');
      assert.equal(result.params[1], 'value2');
    });
  });
});
