var where = require('../lib/where');
var assert = require("assert"),
  util = require('util');

describe('WHERE clause generation', function () {
  describe('parseKey', function () {
    describe('Plain identifiers', function () {
      it('should quote an unquoted plain identifier', function () {
        var result = where.parseKey('myfield');
        assert.equal(result.field, 'myfield');
        assert.equal(result.quotedField, '"myfield"');
      });

      it('should not double-quote a quoted plain identifier', function () {
        var result = where.parseKey('"my field"');
        assert.equal(result.field, 'my field');
        assert.equal(result.quotedField, '"my field"');
      });
    });

    describe('JSON traversal', function () {
      it('should format a JSON path without any quotes', function () {
        var result = where.parseKey('json#>>{outer,inner}');
        assert.equal(result.field, 'json');
        assert.equal(result.quotedField, '"json"#>>\'{outer,inner}\'');
      });

      it('should format a JSON path with a quoted field', function () {
        var result = where.parseKey('"json field"#>>{outer,inner}');
        assert.equal(result.field, 'json field');
        assert.equal(result.quotedField, '"json field"#>>\'{outer,inner}\'');
      });

      it('should format a JSON path with a quoted {outer,inner}', function () {
        var result = where.parseKey('json#>>\'{outer,inner}\'');
        assert.equal(result.field, 'json');
        assert.equal(result.quotedField, '"json"#>>\'{outer,inner}\'');
      });

      it('should format a JSON path with quotes all over', function () {
        var result = where.parseKey('"json field"#>>\'{outer,inner}\'');
        assert.equal(result.field, 'json field');
        assert.equal(result.quotedField, '"json field"#>>\'{outer,inner}\'');
      });

      it('should format a JSON path with whitespace and no quotes', function () {
        var result = where.parseKey('json #>> {outer,inner}');
        assert.equal(result.field, 'json');
        assert.equal(result.quotedField, '"json"#>>\'{outer,inner}\'');
      });

      it('should format a JSON path with whitespace and quotes', function () {
        var result = where.parseKey('"json field" #>> \'{outer,inner}\'');
        assert.equal(result.field, 'json field');
        assert.equal(result.quotedField, '"json field"#>>\'{outer,inner}\'');
      });
    });

    describe('operations', function () {
      it('should default to equivalence', function () {
        var result = where.parseKey('myfield');
        assert.equal(result.field, 'myfield');
        assert.equal(result.quotedField, '"myfield"');
        assert.equal(result.operator, '=');
        assert.equal(result.mutator, undefined);
      });

      it('should get the operation details for an unquoted identifier', function () {
        var result = where.parseKey('myfield <=');
        assert.equal(result.field, 'myfield');
        assert.equal(result.quotedField, '"myfield"');
        assert.equal(result.operator, '<=');
        assert.equal(result.mutator, undefined);
      });

      it('should get the operation details for a quoted identifier', function () {
        var result = where.parseKey('"my field" <=');
        assert.equal(result.field, 'my field');
        assert.equal(result.quotedField, '"my field"');
        assert.equal(result.operator, '<=');
        assert.equal(result.mutator, undefined);
      });

      it('should allow any amount of whitespace', function () {
        var result = where.parseKey(' \r\n \t myfield  \r\n  \t  \t <= \r\n\t');
        assert.equal(result.field, 'myfield');
        assert.equal(result.quotedField, '"myfield"');
        assert.equal(result.operator, '<=');
        assert.equal(result.mutator, undefined);
      });

      it('should get the appropriate mutator', function () {
        var result = where.parseKey('"my field" @>');
        assert.equal(result.field, 'my field');
        assert.equal(result.quotedField, '"my field"');
        assert.equal(result.operator, '@>');
        assert.equal(typeof result.mutator, 'function');
        assert.equal(result.mutator(['hi']), '{hi}');
      });

      it('should get operations for a JSON field', function () {
        var result = where.parseKey('json->>key <=');
        assert.equal(result.field, 'json');
        assert.equal(result.quotedField, '"json"->>\'key\'');
        assert.equal(result.operator, '<=');
        assert.equal(result.mutator, undefined);
      });

      it('should get operations for a quotey/whitespacey JSON field', function () {
        var result = where.parseKey('"json field" ->> \'key\' <=');
        assert.equal(result.field, 'json field');
        assert.equal(result.quotedField, '"json field"->>\'key\'');
        assert.equal(result.operator, '<=');
        assert.equal(result.mutator, undefined);
      });

      it('should get operations for a JSON object', function () {
        var result = where.parseKey('json#>>{outer,inner} <=');
        assert.equal(result.field, 'json');
        assert.equal(result.quotedField, '"json"#>>\'{outer,inner}\'');
        assert.equal(result.operator, '<=');
        assert.equal(result.mutator, undefined);
      });

      it('should get operations for a quotey/whitespacey JSON object', function () {
        var result = where.parseKey('"json field" #>> \'{outer,inner}\' <=');
        assert.equal(result.field, 'json field');
        assert.equal(result.quotedField, '"json field"#>>\'{outer,inner}\'');
        assert.equal(result.operator, '<=');
        assert.equal(result.mutator, undefined);
      });

      it('should match the longest possible operator', function () {
        var result = where.parseKey('field ~~*'); // ~ and ~* are also operators
        assert.equal(result.field, 'field');
        assert.equal(result.quotedField, '"field"');
        assert.equal(result.operator, 'ILIKE');
        assert.equal(result.mutator, undefined);
      });

      it('should ignore the case of LIKE and similar operators', function () {
        var result = where.parseKey('field LikE');
        assert.equal(result.field, 'field');
        assert.equal(result.quotedField, '"field"');
        assert.equal(result.operator, 'LIKE');
        assert.equal(result.mutator, undefined);
      });
    });

    describe('casting', function () {
      it('should cast fields', function () {
        var result = where.parseKey('field::text LIKE');
        assert.equal(result.field, 'field::text');
        assert.equal(result.quotedField, '"field"::text');
        assert.equal(result.operator, 'LIKE');
        assert.equal(result.mutator, undefined);
      });

      it('should cast quoted fields', function () {
        var result = where.parseKey('"field"::text LIKE');
        assert.equal(result.field, 'field::text');
        assert.equal(result.quotedField, '"field"::text');
        assert.equal(result.operator, 'LIKE');
        assert.equal(result.mutator, undefined);
      });
    });
  });

  describe('forTable', function () {
    it('should create an empty WHERE clause', function () {
      var result = where.forTable({});
      assert.equal(result.where, ' \nWHERE TRUE');
      assert.equal(result.params.length, 0);
    });

    it('should create a basic WHERE clause', function () {
      var result = where.forTable({field: 'value'});
      assert.equal(result.where, ' \nWHERE "field" = $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], 'value');
    });

    it('should AND together predicates', function () {
      var result = where.forTable({field1: 'value1', field2: 'value2'});
      assert.equal(result.where, ' \nWHERE "field1" = $1 \nAND "field2" = $2');
      assert.equal(result.params.length, 2);
      assert.equal(result.params[0], 'value1');
      assert.equal(result.params[1], 'value2');
    });
  });

  describe('generate', function () {
    it('should return predicates and parameters', function () {
      var result = where.generate({
        params: [],
        predicates: [],
        offset: 0
      }, {field1: 'value1', field2: 'value2'}, 'predicate');

      assert.equal(result.predicates.length, 2);
      assert.equal(result.predicates[0], '"field1" = $1');
      assert.equal(result.predicates[1], '"field2" = $2');
      assert.equal(result.params.length, 2);
      assert.equal(result.params[0], 'value1');
      assert.equal(result.params[1], 'value2');
    });

    describe('with subgroups', function () {
      it('should encapsulate and OR together subgroups', function () {
        var result = where.generate(
          {params: [], predicates: [], offset: 0},
          {or: [{
              field1: 'value1'
            }, {
              field2: 'value2', field3: 'value3'
            }, {
              field4: 'value4'
            }]},
          'predicate'
        );

        assert.equal(result.predicates.length, 1);
        assert.equal(result.predicates[0], '(("field1" = $1) OR ("field2" = $2 AND "field3" = $3) OR ("field4" = $4))');
        assert.equal(result.params.length, 4);
        assert.equal(result.params[0], 'value1');
        assert.equal(result.params[1], 'value2');
        assert.equal(result.params[2], 'value3');
        assert.equal(result.params[3], 'value4');
      });

      it('should not pollute other fields', function () {
        var result = where.generate(
          {params: [], predicates: [], offset: 0},
          {or: [{field1: 'value1'}, {field2: 'value2'}], field3: 'value3'},
          'predicate'
        );

        assert.equal(result.predicates.length, 2);
        assert.equal(result.predicates[0], '(("field1" = $1) OR ("field2" = $2))');
        assert.equal(result.predicates[1], '"field3" = $3');
        assert.equal(result.params.length, 3);
        assert.equal(result.params[0], 'value1');
        assert.equal(result.params[1], 'value2');
        assert.equal(result.params[2], 'value3');
      });

      it('should return a usable predicate if only given one subgroup', function () {
        var result = where.generate(
          {params: [], predicates: [], offset: 0},
          {or: [{field1: 'value1'}]},
          'predicate'
        );

        assert.equal(result.predicates.length, 1);
        assert.equal(result.predicates[0], '(("field1" = $1))');
        assert.equal(result.params.length, 1);
        assert.equal(result.params[0], 'value1');
      });

      it('should return a usable predicate if given one subgroup as an object', function () {
        var result = where.generate(
          {params: [], predicates: [], offset: 0},
          {or: [{field1: 'value1'}]},
          'predicate'
        );

        assert.equal(result.predicates.length, 1);
        assert.equal(result.predicates[0], '(("field1" = $1))');
        assert.equal(result.params.length, 1);
        assert.equal(result.params[0], 'value1');
      });

      it('recurses', function () {
        var result = where.generate(
          {params: [], predicates: [], offset: 0},
          {
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
          },
          'predicate');

        assert.equal(result.predicates.length, 1);
        assert.equal(result.predicates[0], '(("field1" = $1 AND (("field2" = $2) OR ("field3" = $3))) OR ("field2" = $4 AND "field3" = $5))');
        assert.equal(result.params.length, 5);
        assert.equal(result.params[0], 'value1');
        assert.equal(result.params[1], 'value4');
        assert.equal(result.params[2], 'value5');
        assert.equal(result.params[3], 'value2');
        assert.equal(result.params[4], 'value3');
      });
    });
  });

  describe('predicate', function () {
    it('should build an equality predicate', function () {
      var condition = {quotedField: '"field"', operator: '='};
      var result = where.predicate({params: [], predicates: [], offset: 0}, condition, 'value');
      assert.equal(result.predicates.length, 1);
      assert.equal(result.predicates[0], '"field" = $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], 'value');
    });

    it('should interpolate nulls directly', function () {
      var condition = {quotedField: '"field"', operator: '='};
      var result = where.predicate({params: [], predicates: [], offset: 0}, condition, null);
      assert.equal(result.predicates.length, 1);
      assert.equal(result.predicates[0], '"field" IS null');
      assert.equal(result.params.length, 0);
    });

    it('should apply operation mutators', function () {
      var condition = {
        quotedField: '"field"',
        operator: '@>',
        mutator: function (arr) {
          return util.format('{%s}', arr.map(function (v) {
            if (v.search(/[,{}]/) !== -1) { return util.format('"%s"', v); }

            return v;
          }).join(','));
      }};
      var result = where.predicate({params: [], predicates: [], offset: 0}, condition, ['value']);
      assert.equal(result.predicates.length, 1);
      assert.equal(result.predicates[0], '"field" @> $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], '{value}');
    });

    it('should create IN clauses for array parameters', function () {
      var condition = {quotedField: '"field"', operator: '='};
      var result = where.predicate({params: [], predicates: [], offset: 0}, condition, ['value1', 'value2']);
      assert.equal(result.predicates.length, 1);
      assert.equal(result.predicates[0], '"field" IN ($1, $2)');
      assert.equal(result.params.length, 2);
      assert.equal(result.params[0], 'value1');
      assert.equal(result.params[1], 'value2');
    });
  });

  describe('docPredicate', function () {
    it('should build an equality predicate using the JSON contains op', function () {
      var condition = {field: 'field', operator: '='};
      var result = where.docPredicate({params: [], predicates: [], offset: 0}, condition, 'value', {field: 'value'});
      assert.equal(result.predicates.length, 1);
      assert.equal(result.predicates[0], 'body @> $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], JSON.stringify({field: 'value'}));
    });

    it('should build a non-equality predicate', function () {
      var condition = {field: 'field', operator: '<>'};
      var result = where.docPredicate({params: [], predicates: [], offset: 0}, condition, 'value', {'field <>': 'value'});
      assert.equal(result.predicates.length, 1);
      assert.equal(result.predicates[0], '(body ->> \'field\') <> $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], 'value');
    });

    it('should cast booleans in non-equality predicates', function () {
      var condition = {field: 'field', operator: '<>'};
      var result = where.docPredicate({params: [], predicates: [], offset: 0}, condition, true, {'field <>': true});
      assert.equal(result.predicates.length, 1);
      assert.equal(result.predicates[0], '(body ->> \'field\')::boolean <> true');
      assert.equal(result.params.length, 0);
    });

    it('should cast numbers in non-equality predicates', function () {
      var condition = {field: 'field', operator: '<>'};
      var result = where.docPredicate({params: [], predicates: [], offset: 0}, condition, 123.45, {'field <>': 123.45});
      assert.equal(result.predicates.length, 1);
      assert.equal(result.predicates[0], '(body ->> \'field\')::decimal <> 123.45');
      assert.equal(result.params.length, 0);
    });

    it('should cast dates in non-equality predicates', function () {
      var date = new Date();
      var condition = {field: 'field', operator: '<>'};
      var result = where.docPredicate({params: [], predicates: [], offset: 0}, condition, date, {'field <>': date});
      assert.equal(result.predicates.length, 1);
      assert.equal(result.predicates[0], '(body ->> \'field\')::timestamp <> $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], date);
    });

    it('should create IN clauses for array parameters', function () {
      var condition = {field: 'field', operator: '='};
      var result = where.docPredicate({params: [], predicates: [], offset: 0}, condition, ['value1', 'value2'], {field: ['value1', 'value2']});
      assert.equal(result.predicates.length, 1);
      assert.equal(result.predicates[0], '(body ->> \'field\') IN ($1, $2)');
      assert.equal(result.params.length, 2);
      assert.equal(result.params[0], 'value1');
      assert.equal(result.params[1], 'value2');
    });
  });

  describe('isPkSearch', function () {
    it('should pass integers', function () {
      assert.equal(where.isPkSearch(1), true);
    });

    it('should pass v1 uuids', function () {
      assert.equal(where.isPkSearch('a432c1f6-0443-11e6-b512-3e1d05defe78'), true);
    });

    it('should pass v4 uuids', function () {
      assert.equal(where.isPkSearch('a2a072cc-7a41-4fd6-bd16-ae1677166c05'), true);
    });

    it('should reject integers in strings', function () {
      assert.equal(where.isPkSearch('1'), false);
    });

    it('should reject badly versioned uuids', function () {
      assert.equal(where.isPkSearch('a2a072cc-7a41-9fd6-bd16-ae1677166c05'), false);
    });

    it('should reject badly formatted uuids', function () {
      assert.equal(where.isPkSearch('a2a072cc7a419fd6bd16ae1677166c05'), false);
    });
  });
});
