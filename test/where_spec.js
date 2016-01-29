var assert = require("assert");
var where = require('../lib/where');

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

    describe('JSON fields', function () {
      it('should format a JSON field without any quotes', function () {
        var result = where.parseKey('json->>key');
        assert.equal(result.field, 'json');
        assert.equal(result.quotedField, '"json"->>\'key\'');
      });

      it('should format a JSON field with a quoted field', function () {
        var result = where.parseKey('"json field"->>key');
        assert.equal(result.field, 'json field');
        assert.equal(result.quotedField, '"json field"->>\'key\'');
      });

      it('should format a JSON field with a quoted key', function () {
        var result = where.parseKey('json->>\'key\'');
        assert.equal(result.field, 'json');
        assert.equal(result.quotedField, '"json"->>\'key\'');
      });

      it('should format a JSON field with quotes all over', function () {
        var result = where.parseKey('"json field"->>\'key\'');
        assert.equal(result.field, 'json field');
        assert.equal(result.quotedField, '"json field"->>\'key\'');
      });

      it('should format a JSON field with whitespace and no quotes', function () {
        var result = where.parseKey('json ->> key');
        assert.equal(result.field, 'json');
        assert.equal(result.quotedField, '"json"->>\'key\'');
      });

      it('should format a JSON field with whitespace and quotes', function () {
        var result = where.parseKey('"json field" ->> \'key\'');
        assert.equal(result.field, 'json field');
        assert.equal(result.quotedField, '"json field"->>\'key\'');
      });
    });

    describe('JSON objects', function () {
      it('should format a JSON object without any quotes', function () {
        var result = where.parseKey('json#>>{outer,inner}');
        assert.equal(result.field, 'json');
        assert.equal(result.quotedField, '"json"#>>\'{outer,inner}\'');
      });

      it('should format a JSON object with a quoted field', function () {
        var result = where.parseKey('"json field"#>>{outer,inner}');
        assert.equal(result.field, 'json field');
        assert.equal(result.quotedField, '"json field"#>>\'{outer,inner}\'');
      });

      it('should format a JSON object with a quoted {outer, inner}', function () {
        var result = where.parseKey('json#>>\'{outer,inner}\'');
        assert.equal(result.field, 'json');
        assert.equal(result.quotedField, '"json"#>>\'{outer,inner}\'');
      });

      it('should format a JSON object with quotes all over', function () {
        var result = where.parseKey('"json field"#>>\'{outer,inner}\'');
        assert.equal(result.field, 'json field');
        assert.equal(result.quotedField, '"json field"#>>\'{outer,inner}\'');
      });

      it('should format a JSON object with whitespace and no quotes', function () {
        var result = where.parseKey('json #>> {outer, inner}');
        assert.equal(result.field, 'json');
        assert.equal(result.quotedField, '"json"#>>\'{outer,inner}\'');
      });

      it('should format a JSON object with whitespace and quotes', function () {
        var result = where.parseKey('"json field" #>> \'{outer, inner}\'');
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
        var result = where.parseKey('myfield    \t  \t <=');
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
    });
  });

  describe('forTable', function () {
    it('should create a basic WHERE clause', function () {
      var result = where.forTable({field: 'value'});
      assert.equal(result.where, ' \nWHERE "field" = $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], 'value');
    });

    it('should AND together conditions', function () {
      var result = where.forTable({field1: 'value1', field2: 'value2'});
      assert.equal(result.where, ' \nWHERE "field1" = $1 \nAND "field2" = $2');
      assert.equal(result.params.length, 2);
      assert.equal(result.params[0], 'value1');
      assert.equal(result.params[1], 'value2');
    });

    it('should interpolate nulls directly', function () {
      var result = where.forTable({field1: 'value1', field2: null});
      assert.equal(result.where, ' \nWHERE "field1" = $1 \nAND "field2" IS null');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], 'value1');
    });

    it('should apply operation mutators', function () {
      var result = where.forTable({field1: 'value1', 'field2 @>': ['value2']});
      assert.equal(result.where, ' \nWHERE "field1" = $1 \nAND "field2" @> $2');
      assert.equal(result.params.length, 2);
      assert.equal(result.params[0], 'value1');
      assert.equal(result.params[1], '{value2}');
    });

    it('should create IN clauses for array parameters', function () {
      var result = where.forTable({field1: 'value1', field2: ['value2', 'value3']});
      assert.equal(result.where, ' \nWHERE "field1" = $1 \nAND "field2" IN ($2, $3)');
      assert.equal(result.params.length, 3);
      assert.equal(result.params[0], 'value1');
      assert.equal(result.params[1], 'value2');
      assert.equal(result.params[2], 'value3');
    });
  });

  describe('forDocument', function () {
    it('should create a basic WHERE clause for equality predicates', function () {
      var result = where.forDocument({field: 'value'});
      assert.equal(result.where, ' \nWHERE body @> $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], JSON.stringify({field: 'value'}));
    });

    it('should create a basic WHERE clause for non-equality predicates', function () {
      var result = where.forDocument({'field <>': 'value'});
      assert.equal(result.where, ' \nWHERE (body ->> \'field\') <> $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], 'value');
    });

    it('should cast booleans in non-equality predicates', function () {
      var result = where.forDocument({'field <>': true});
      assert.equal(result.where, ' \nWHERE (body ->> \'field\')::boolean <> true');
      assert.equal(result.params.length, 0);
    });

    it('should cast numbers in non-equality predicates', function () {
      var result = where.forDocument({'field <>': 123.45});
      assert.equal(result.where, ' \nWHERE (body ->> \'field\')::decimal <> 123.45');
      assert.equal(result.params.length, 0);
    });

    it('should cast dates in non-equality predicates', function () {
      var date = new Date();
      var result = where.forDocument({'field <': date});
      assert.equal(result.where, ' \nWHERE (body ->> \'field\')::timestamp < $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], date);
    });

    it('should AND together conditions', function () {
      var result = where.forDocument({field1: 'value1', field2: 'value2'});
      assert.equal(result.where, ' \nWHERE body @> $1 \nAND body @> $2');
      assert.equal(result.params.length, 2);
      assert.equal(result.params[0], JSON.stringify({field1: 'value1'}));
      assert.equal(result.params[1], JSON.stringify({field2: 'value2'}));
    });

    it('should create IN clauses for array parameters', function () {
      var result = where.forDocument({field1: 'value1', field2: ['value2', 'value3']});
      assert.equal(result.where, ' \nWHERE body @> $1 \nAND (body ->> \'field2\') IN ($2, $3)');
      assert.equal(result.params.length, 3);
      assert.equal(result.params[0], JSON.stringify({field1: 'value1'}));
      assert.equal(result.params[1], 'value2');
      assert.equal(result.params[2], 'value3');
    });
  });
});
