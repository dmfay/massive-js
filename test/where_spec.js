var assert = require("assert");
var helpers = require("./helpers");
var _ = require("underscore")._;
var where = require('../lib/where');

describe('WHERE clause generation', function () {
  describe('parseKey', function () {
    describe('Plain identifiers', function () {
      it('should quote an unquoted plain identifier', function () {
        var result = where.parseKey('myfield');
        assert.equal(result.field, '"myfield"');
      });

      it('should not double-quote a quoted plain identifier', function () {
        var result = where.parseKey('"my field"');
        assert.equal(result.field, '"my field"');
      });
    });

    describe('JSON fields', function () {
      it('should format a JSON field without any quotes', function () {
        var result = where.parseKey('json->>key');
        assert.equal(result.field, '"json"->>\'key\'');
      });

      it('should format a JSON field with a quoted field', function () {
        var result = where.parseKey('"json field"->>key');
        assert.equal(result.field, '"json field"->>\'key\'');
      });

      it('should format a JSON field with a quoted key', function () {
        var result = where.parseKey('json->>\'key\'');
        assert.equal(result.field, '"json"->>\'key\'');
      });

      it('should format a JSON field with quotes all over', function () {
        var result = where.parseKey('"json field"->>\'key\'');
        assert.equal(result.field, '"json field"->>\'key\'');
      });

      it('should format a JSON field with whitespace and no quotes', function () {
        var result = where.parseKey('json ->> key');
        assert.equal(result.field, '"json"->>\'key\'');
      });

      it('should format a JSON field with whitespace and quotes', function () {
        var result = where.parseKey('"json field" ->> \'key\'');
        assert.equal(result.field, '"json field"->>\'key\'');
      });
    });

    describe('JSON objects', function () {
      it('should format a JSON object without any quotes', function () {
        var result = where.parseKey('json#>>{outer,inner}');
        assert.equal(result.field, '"json"#>>\'{outer,inner}\'');
      });

      it('should format a JSON object with a quoted field', function () {
        var result = where.parseKey('"json field"#>>{outer,inner}');
        assert.equal(result.field, '"json field"#>>\'{outer,inner}\'');
      });

      it('should format a JSON object with a quoted {outer, inner}', function () {
        var result = where.parseKey('json#>>\'{outer,inner}\'');
        assert.equal(result.field, '"json"#>>\'{outer,inner}\'');
      });

      it('should format a JSON object with quotes all over', function () {
        var result = where.parseKey('"json field"#>>\'{outer,inner}\'');
        assert.equal(result.field, '"json field"#>>\'{outer,inner}\'');
      });

      it('should format a JSON object with whitespace and no quotes', function () {
        var result = where.parseKey('json #>> {outer, inner}');
        assert.equal(result.field, '"json"#>>\'{outer,inner}\'');
      });

      it('should format a JSON object with whitespace and quotes', function () {
        var result = where.parseKey('"json field" #>> \'{outer, inner}\'');
        assert.equal(result.field, '"json field"#>>\'{outer,inner}\'');
      });
    });

    describe('operations', function () {
      it('should default to equivalence', function () {
        var result = where.parseKey('myfield');
        assert.equal(result.field, '"myfield"');
        assert.equal(result.operator, '=');
        assert.equal(result.mutator, undefined);
      });

      it('should get the operation details for an unquoted identifier', function () {
        var result = where.parseKey('myfield <=');
        assert.equal(result.field, '"myfield"');
        assert.equal(result.operator, '<=');
        assert.equal(result.mutator, undefined);
      });

      it('should get the operation details for a quoted identifier', function () {
        var result = where.parseKey('"my field" <=');
        assert.equal(result.field, '"my field"');
        assert.equal(result.operator, '<=');
        assert.equal(result.mutator, undefined);
      });

      it('should get the appropriate mutator', function () {
        var result = where.parseKey('"my field" @>');
        assert.equal(result.field, '"my field"');
        assert.equal(result.operator, '@>');
        assert.equal(typeof result.mutator, 'function');
        assert.equal(result.mutator(['hi']), '{hi}');
      });

      it('should get operations for a JSON field', function () {
        var result = where.parseKey('json->>key <=');
        assert.equal(result.field, '"json"->>\'key\'');
        assert.equal(result.operator, '<=');
        assert.equal(result.mutator, undefined);
      });

      it('should get operations for a quotey/whitespacey JSON field', function () {
        var result = where.parseKey('"json field" ->> \'key\' <=');
        assert.equal(result.field, '"json field"->>\'key\'');
        assert.equal(result.operator, '<=');
        assert.equal(result.mutator, undefined);
      });

      it('should get operations for a JSON object', function () {
        var result = where.parseKey('json#>>{outer,inner} <=');
        assert.equal(result.field, '"json"#>>\'{outer,inner}\'');
        assert.equal(result.operator, '<=');
        assert.equal(result.mutator, undefined);
      });

      it('should get operations for a quotey/whitespacey JSON object', function () {
        var result = where.parseKey('"json field" #>> \'{outer,inner}\' <=');
        assert.equal(result.field, '"json field"#>>\'{outer,inner}\'');
        assert.equal(result.operator, '<=');
        assert.equal(result.mutator, undefined);
      });
    });
  });
});
