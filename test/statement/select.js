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

    it('should alias fields in document mode', function () {
      const result = new Select(source, {}, {
        fields: ['one', 'two'],
        document: true
      });

      assert.equal(result.format(), `SELECT "body"->>'one' AS "one","body"->>'two' AS "two",id FROM testsource WHERE TRUE ORDER BY 1`);
    });

    it('should add expressions', function () {
      const result = new Select(source, {}, {
        exprs: {
          colsum: 'col1 + col2',
          coldiff: 'col1 - col2'
        }
      });

      assert.equal(result.format(), 'SELECT col1 + col2 AS "colsum",col1 - col2 AS "coldiff" FROM testsource WHERE TRUE ORDER BY 1');
    });

    it('should add fields and expressions', function () {
      const result = new Select(source, {}, {
        fields: ['col1', 'col2'],
        exprs: {
          colsum: 'col1 + col2',
          coldiff: 'col1 - col2'
        }
      });

      assert.equal(result.format(), 'SELECT "col1","col2",col1 + col2 AS "colsum",col1 - col2 AS "coldiff" FROM testsource WHERE TRUE ORDER BY 1');
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

    describe('keyset pagination', function () {
      it('tests the last values of the sort fields', function () {
        const result = new Select(source, {}, {
          pageLength: 10,
          order: [{
            field: 'col1',
            last: 123
          }, {
            field: 'col2',
            last: 456
          }]
        });

        assert.equal(result.pageLength, 10);
        assert.equal(result.pagination, '("col1","col2") > ($1,$2)');
        assert.equal(result.where.conditions, 'TRUE');
        assert.isEmpty(result.where.params);
        assert.deepEqual(result.params, [123, 456]);
        assert.equal(result.format(), 'SELECT * FROM testsource WHERE TRUE AND ("col1","col2") > ($1,$2) ORDER BY "col1" asc,"col2" asc FETCH FIRST 10 ROWS ONLY');
      });

      it('reverses direction depending on the first field', function () {
        const result = new Select(source, {}, {
          pageLength: 10,
          order: [{
            field: 'col1',
            direction: 'desc',
            last: 123
          }, {
            field: 'col2',
            direction: 'asc',
            last: 456
          }]
        });

        assert.equal(result.pageLength, 10);
        assert.equal(result.pagination, '("col1","col2") < ($1,$2)');
        assert.equal(result.where.conditions, 'TRUE');
        assert.isEmpty(result.where.params);
        assert.deepEqual(result.params, [123, 456]);
        assert.equal(result.format(), 'SELECT * FROM testsource WHERE TRUE AND ("col1","col2") < ($1,$2) ORDER BY "col1" desc,"col2" asc FETCH FIRST 10 ROWS ONLY');
      });

      it('starts from the beginning', function () {
        const result = new Select(source, {}, {
          pageLength: 10,
          order: [{
            field: 'col1'
          }, {
            field: 'col2'
          }]
        });

        assert.equal(result.pageLength, 10);
        assert.isUndefined(result.pagination);
        assert.equal(result.where.conditions, 'TRUE');
        assert.isEmpty(result.where.params);
        assert.deepEqual(result.params, []);
        assert.equal(result.format(), 'SELECT * FROM testsource WHERE TRUE ORDER BY "col1" asc,"col2" asc FETCH FIRST 10 ROWS ONLY');
      });

      it('works with pregenerated where specs', function () {
        const result = new Select(source, {
          conditions: 'col2 = $1',
          params: [1]
        }, {
          pageLength: 10,
          order: [{
            field: 'col1',
            last: 5
          }]
        });

        assert.equal(result.where.conditions, 'col2 = $1');
        assert.deepEqual(result.params, [1, 5]);
        assert.equal(result.pagination, '("col1") > ($2)');
        assert.equal(result.format(), 'SELECT * FROM testsource WHERE col2 = $1 AND ("col1") > ($2) ORDER BY "col1" asc FETCH FIRST 10 ROWS ONLY');
      });

      it('requires an order definition', function (done) {
        const result = new Select(source, {}, {pageLength: 10});

        try {
          result.format();
        } catch (err) {
          assert.equal(err.message, 'Keyset paging with pageLength requires options.order');

          done();
        }
      });

      it('does not work with offsets', function (done) {
        const result = new Select(source, {}, {
          pageLength: 10,
          order: [{
            field: 'col1'
          }],
          offset: 10
        });

        try {
          result.format();
        } catch (err) {
          assert.equal(err.message, 'Keyset paging cannot be used with offset and limit');

          done();
        }
      });

      it('does not work with limits', function (done) {
        const result = new Select(source, {}, {
          pageLength: 10,
          order: [{
            field: 'col1'
          }],
          limit: 10
        });

        try {
          result.format();
        } catch (err) {
          assert.equal(err.message, 'Keyset paging cannot be used with offset and limit');

          done();
        }
      });
    });
  });
});
