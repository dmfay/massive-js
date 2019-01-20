'use strict';

const where = require('../../lib/statement/where');
const ops = require('../../lib/statement/operations');
const parseKey = require('../../lib/util/parse-key');

describe('WHERE clause generation', function () {
  /**
   * Helper for generating conditions in WHERE clause testing.
   *
   * @param {String} key - The key and optional operation.
   * @param {Any} value - The value being tested in the predicate.
   * @param {Integer} offset - The condition offset.
   * @returns {Object} A condition object.
   */
  function getCondition (key, value, offset) {
    const condition = parseKey(key, ops);
    condition.value = value;
    condition.offset = offset;
    condition.params = [];

    return condition;
  }

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

    it('should accommodate pre-built predicates', function () {
      const result = where({
        conditions: '"field2" @@ lower($1)',
        params: ['value2'],
        where: {
          field1: 'value1'
        },
        nestedGenerator: 'tableGenerator'
      });

      assert.equal(result.conditions, '"field2" @@ lower($1) AND "field1" = $2');
      assert.equal(result.params.length, 2);
      assert.equal(result.params[0], 'value2');
      assert.equal(result.params[1], 'value1');
    });

    it('should accommodate pre-built predicates with a different nested generator', function () {
      const result = where({
        conditions: '"field2" @@ lower($1)',
        params: ['value2'],
        where: {
          field1: 'value1'
        },
        nestedGenerator: 'docGenerator'
      });

      assert.equal(result.conditions, '"field2" @@ lower($1) AND "body" @> $2');
      assert.equal(result.params.length, 2);
      assert.equal(result.params[0], 'value2');
      assert.equal(result.params[1], JSON.stringify({field1: 'value1'}));
    });

    it('should return conditions and parameters', function () {
      const result = where({field1: 'value1', field2: 'value2'});

      assert.equal(result.conditions, '"field1" = $1 AND "field2" = $2');
      assert.equal(result.params.length, 2);
      assert.equal(result.params[0], 'value1');
      assert.equal(result.params[1], 'value2');
    });

    it('should keep non-contains stuff separate in document queries', function () {
      const result = where({
        field: [{one: 'two', three: 'four'}],
        'otherthing >': 123
      }, 0, 'docGenerator');

      assert.equal(result.conditions, `"body" @> $1 AND ("body" ->> 'otherthing')::decimal > 123`);
      assert.lengthOf(result.params, 1);
      assert.equal(result.params[0], '{"field":[{"one":"two","three":"four"}]}');
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

    describe('with disjunction subgroups', function () {
      it('should encapsulate and OR together subgroups', function () {
        const result = where({
          or: [{
            field1: 'value1'
          }, {
            field2: 'value2', field3: 'value3'
          }, {
            field4: 'value4'
          }]
        });

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

    describe('with nested conjunction subgroups', function () {
      it('should encapsulate and AND together subgroups', function () {
        const result = where({
          and: [{
            field1: 'value1'
          }, {
            field2: 'value2', field3: 'value3'
          }, {
            field4: 'value4'
          }]
        });

        assert.equal(result.conditions, '(("field1" = $1) AND ("field2" = $2 AND "field3" = $3) AND ("field4" = $4))');
        assert.equal(result.params.length, 4);
        assert.equal(result.params[0], 'value1');
        assert.equal(result.params[1], 'value2');
        assert.equal(result.params[2], 'value3');
        assert.equal(result.params[3], 'value4');
      });

      it('should not pollute other fields', function () {
        const result = where({
          and: [{field1: 'value1'}, {field2: 'value2'}],
          field3: 'value3'
        });

        assert.equal(result.conditions, '(("field1" = $1) AND ("field2" = $2)) AND "field3" = $3');
        assert.equal(result.params.length, 3);
        assert.equal(result.params[0], 'value1');
        assert.equal(result.params[1], 'value2');
        assert.equal(result.params[2], 'value3');
      });

      it('should return a usable predicate if only given one subgroup', function () {
        const result = where({and: [{field1: 'value1'}]});

        assert.equal(result.conditions, '(("field1" = $1))');
        assert.equal(result.params.length, 1);
        assert.equal(result.params[0], 'value1');
      });

      it('recurses', function () {
        const result = where({
          or: [{
            field1: 'value1',
            and: [{
              field2: 'value4'
            }, {
              field3: 'value5'
            }]
          }, {
            field2: 'value2',
            field3: 'value3'
          }]
        });

        assert.equal(result.conditions, '(("field1" = $1 AND (("field2" = $2) AND ("field3" = $3))) OR ("field2" = $4 AND "field3" = $5))');
        assert.equal(result.params.length, 5);
        assert.equal(result.params[0], 'value1');
        assert.equal(result.params[1], 'value4');
        assert.equal(result.params[2], 'value5');
        assert.equal(result.params[3], 'value2');
        assert.equal(result.params[4], 'value3');
      });
    });
  });

  describe('tableGenerator', function () {
    it('should add values to params', function () {
      const condition = getCondition('field', 'value', 1, []);
      const result = where.tableGenerator(condition);
      assert.equal(result.predicate, '"field" = $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], 'value');
    });

    it('should apply mutators', function () {
      const condition = getCondition('field', 'value', 1, []);
      condition.appended.mutator = cond => {
        cond.value = 'hi!';

        return cond;
      };

      const result = where.tableGenerator(condition);
      assert.equal(result.predicate, '"field" = hi!');
      assert.equal(result.params.length, 0);
    });
  });

  describe('docGenerator', function () {
    it('should build deep traversals', function () {
      const obj = {field: [{one: 'two'}]};
      const condition = getCondition('field', [{one: 'two'}], 1);
      const result = where.docGenerator(condition, 'field', obj);
      assert.equal(result.predicate, '"body" @> $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], JSON.stringify(obj));
    });

    it('should omit other keys and create strict hierarchies for deep traversals', function () {
      const obj = {field: [{one: 'two'}], somethingelse: 'hi'};
      const condition = getCondition('field', [{one: 'two'}], 1);
      const result = where.docGenerator(condition, 'field', obj);
      assert.equal(result.predicate, '"body" @> $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], JSON.stringify({field: [{one: 'two'}]}));
    });

    it('should create an IS comparison predicate', function () {
      const condition = getCondition('field is', true, 1);
      const result = where.docGenerator(condition, 'field is', {'field is': true});
      assert.equal(result.predicate, '("body" ->> \'field\') IS true');
      assert.equal(result.params.length, 0);
    });

    it('should build an equality predicate using the JSON contains op', function () {
      const condition = getCondition('field', 'value', 1);
      const result = where.docGenerator(condition, 'field', {field: 'value'});
      assert.equal(result.predicate, '"body" @> $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], JSON.stringify({field: 'value'}));
    });

    it('should build a non-equality predicate', function () {
      const condition = getCondition('field <>', 'value', 1);
      const result = where.docGenerator(condition, 'field <>', {'field <>': 'value'});
      assert.equal(result.predicate, '("body" ->> \'field\') <> $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], 'value');
    });

    it('should cast booleans in non-equality predicates', function () {
      const condition = getCondition('field <>', true, 1);
      const result = where.docGenerator(condition, 'field <>', {'field <>': true});
      assert.equal(result.predicate, '("body" ->> \'field\')::boolean <> true');
      assert.equal(result.params.length, 0);
    });

    it('should cast numbers in non-equality predicates', function () {
      const condition = getCondition('field <>', 123.45, 1);
      const result = where.docGenerator(condition, 'field <>', {'field <>': 123.45});
      assert.equal(result.predicate, '("body" ->> \'field\')::decimal <> 123.45');
      assert.equal(result.params.length, 0);
    });

    it('should cast dates in non-equality predicates', function () {
      const date = new Date();
      const condition = getCondition('field <>', date, 1);
      const result = where.docGenerator(condition, 'field <>', {'field <>': date});
      assert.equal(result.predicate, '("body" ->> \'field\')::timestamptz <> $1');
      assert.equal(result.params.length, 1);
      assert.equal(result.params[0], date);
    });

    it('should create IN clauses for array parameters', function () {
      const condition = getCondition('field', ['value1', 'value2'], 1);
      const result = where.docGenerator(condition, 'field <>', {field: ['value1', 'value2']});
      assert.equal(result.predicate, '("body" ->> \'field\') IN ($1,$2)');
      assert.equal(result.params.length, 2);
      assert.equal(result.params[0], 'value1');
      assert.equal(result.params[1], 'value2');
    });

    it('should traverse JSON with ->>', function () {
      const condition = getCondition('field', ['value1', 'value2'], 1);
      const result = where.docGenerator(condition, 'field <>', {field: ['value1', 'value2']});
      assert.equal(result.predicate, '("body" ->> \'field\') IN ($1,$2)');
      assert.equal(result.params.length, 2);
      assert.equal(result.params[0], 'value1');
      assert.equal(result.params[1], 'value2');
    });

    it('should use pathing operator #>> for nested values', function () {
      const condition = getCondition('field.one.two', ['value1', 'value2'], 1);
      const result = where.docGenerator(condition, 'field <>', {field: ['value1', 'value2']});
      assert.equal(result.predicate, '("body" #>> \'{field,one,two}\') IN ($1,$2)');
      assert.equal(result.params.length, 2);
      assert.equal(result.params[0], 'value1');
      assert.equal(result.params[1], 'value2');
    });
  });
});
