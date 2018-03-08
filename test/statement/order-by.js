'use strict';

const orderBy = require('../../lib/statement/order-by');

describe('orderBy', function () {
  it('should return an empty string if order is null or undefined', function () {
    assert.equal(orderBy(null), '');
    assert.equal(orderBy(), '');
  });

  it('should not quote exprs', function () {
    assert.equal(orderBy([
      {expr: 'col1 + col2'}
    ]), `ORDER BY col1 + col2 asc`);
  });

  it('should build an order clause from an array of sort criteria', function () {
    assert.equal(orderBy([
      {field: 'col1'},
      {expr: 'col1 + col2'}
    ]), `ORDER BY "col1" asc,col1 + col2 asc`);
  });

  it('should apply cast types', function () {
    assert.equal(orderBy([
      {field: 'col1', type: 'int'},
      {expr: 'col1 + col2', type: 'text'}
    ]), `ORDER BY ("col1")::int asc,(col1 + col2)::text asc`);
  });

  it('should apply directions', function () {
    assert.equal(orderBy([
      {field: 'col1', direction: 'desc'},
      {expr: 'col1 + col2', direction: 'asc'}
    ]), `ORDER BY "col1" desc,col1 + col2 asc`);
  });

  it('should be case-insensitive about directions', function () {
    assert.equal(orderBy([
      {field: 'col1', direction: 'DESC'},
      {expr: 'col1 + col2', direction: 'ASC'}
    ]), `ORDER BY "col1" desc,col1 + col2 asc`);
  });

  it('should apply both cast type and direction', function () {
    assert.equal(orderBy([
      {field: 'col1', type: 'int', direction: 'desc'},
      {expr: 'col1 + col2', type: 'text', direction: 'asc'}
    ]), `ORDER BY ("col1")::int desc,(col1 + col2)::text asc`);
  });

  it('should build an order clause from fields with useBody', function () {
    assert.equal(orderBy([
      {field: 'col1', direction: 'asc', type: 'int'},
      {field: 'col2'}
    ], true), `ORDER BY (body->>'col1')::int asc,body->>'col2' asc`);
  });

  it('should ignore useBody with exprs', function () {
    assert.equal(orderBy([
      {expr: 'col1 + col2', direction: 'desc', type: 'varchar'}
    ], true), `ORDER BY (col1 + col2)::varchar desc`);
  });

  it('should process JSON paths', function () {
    assert.equal(orderBy([
      {field: 'jsonobj.element', direction: 'asc'},
      {field: 'jsonarray[1]', direction: 'desc'},
      {field: 'complex.element[0].with.nested.properties', direction: 'asc'}
    ]), `ORDER BY "jsonobj"->>'element' asc,"jsonarray"->>1 desc,"complex"#>>'{element,0,with,nested,properties}' asc`);
  });
});
