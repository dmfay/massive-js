'use strict';

const Select = require('../../lib/statement/select');

describe('Select', function () {
  const source = {
    delimitedFullName: 'testsource',
    isPkSearch: () => false
  };

  describe('ctor', function () {
    it('should have defaults', function () {
      const query = new Select(source);

      assert.equal(query.source, 'testsource');
      assert.equal(query.fields, '*');
      assert.equal(query.generator, 'tableGenerator');
      assert.isFalse(query.only);
      assert.isFalse(query.single);
      assert.equal(query.order, 'ORDER BY 1');
    });

    it('should apply options', function () {
      const query = new Select(source, {}, {build: true});

      assert.equal(query.source, 'testsource');
      assert.isTrue(query.build);
    });
  });

  describe('format', function () {
    it('should return a basic select', function () {
      const result = new Select(source);
      assert.equal(result.format(), 'SELECT * FROM testsource WHERE TRUE ORDER BY 1');
    });

    it('should add an ONLY', function () {
      const result = new Select(source, {}, {only: true});
      assert.equal(result.format(), 'SELECT * FROM ONLY testsource WHERE TRUE ORDER BY 1');
    });

    // TODO remove in v5
    it('should allow old syntax for columns for now', function () {
      const result = new Select(source, {}, {columns: ['col1 + col2 AS test']});
      assert.equal(result.format(), 'SELECT col1 + col2 AS test FROM testsource WHERE TRUE ORDER BY 1');
    });

    it('should interpolate fields', function () {
      const result = new Select(source, {}, {fields: ['col1']});
      assert.equal(result.format(), 'SELECT "col1" FROM testsource WHERE TRUE ORDER BY 1');
    });

    it('should join arrays', function () {
      const result = new Select(source, {}, {fields: ['col1', 'col2']});
      assert.equal(result.format(), 'SELECT "col1","col2" FROM testsource WHERE TRUE ORDER BY 1');
    });

    it('should parse JSON fields', function () {
      const result = new Select(source, {}, {
        fields: [
          'field.element',
          'field.array[0]',
          'field.array[1].nested[2].element'
        ]
      });

      assert.equal(result.format(), `SELECT "field"->>'element',"field"#>>'{array,0}',"field"#>>'{array,1,nested,2,element}' FROM testsource WHERE TRUE ORDER BY 1`);
    });

    it('should add expressions', function () {
      const result = new Select(source, {}, {
        exprs: {
          colsum: 'col1 + col2',
          coldiff: 'col1 - col2'
        }
      });

      assert.equal(result.format(), 'SELECT col1 + col2 AS colsum,col1 - col2 AS coldiff FROM testsource WHERE TRUE ORDER BY 1');
    });

    it('should add fields and expressions', function () {
      const result = new Select(source, {}, {
        fields: ['col1', 'col2'],
        exprs: {
          colsum: 'col1 + col2',
          coldiff: 'col1 - col2'
        }
      });

      assert.equal(result.format(), 'SELECT "col1","col2",col1 + col2 AS colsum,col1 - col2 AS coldiff FROM testsource WHERE TRUE ORDER BY 1');
    });

    it('should add an offset', function () {
      const result = new Select(source, {}, {offset: 10});
      assert.equal(result.format(), 'SELECT * FROM testsource WHERE TRUE ORDER BY 1 OFFSET 10');
    });

    it('should limit single queries to one result', function () {
      const result = new Select(source, {}, {single: true});
      assert.equal(result.format(), 'SELECT * FROM testsource WHERE TRUE ORDER BY 1 LIMIT 1');
    });

    it('should add a limit', function () {
      const result = new Select(source, {}, {limit: 10});
      assert.equal(result.format(), 'SELECT * FROM testsource WHERE TRUE ORDER BY 1 LIMIT 10');
    });

    it('should add both offset and limit', function () {
      const result = new Select(source, {}, {offset: 10, limit: 10});
      assert.equal(result.format(), 'SELECT * FROM testsource WHERE TRUE ORDER BY 1 OFFSET 10 LIMIT 10');
    });
  });
});
