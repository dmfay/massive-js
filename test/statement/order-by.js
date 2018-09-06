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
    ]), `ORDER BY col1 + col2 ASC`);
  });

  it('should build an order clause from an array of sort criteria', function () {
    assert.equal(orderBy([
      {field: 'col1'},
      {expr: 'col1 + col2'}
    ]), `ORDER BY "col1" ASC,col1 + col2 ASC`);
  });

  it('should apply cast types', function () {
    assert.equal(orderBy([
      {field: 'col1', type: 'int'},
      {expr: 'col1 + col2', type: 'text'}
    ]), `ORDER BY ("col1")::int ASC,(col1 + col2)::text ASC`);
  });

  it('should apply directions', function () {
    assert.equal(orderBy([
      {field: 'col1', direction: 'desc'},
      {expr: 'col1 + col2', direction: 'asc'}
    ]), `ORDER BY "col1" DESC,col1 + col2 ASC`);
  });

  it('should be case-insensitive about directions', function () {
    assert.equal(orderBy([
      {field: 'col1', direction: 'DESC'},
      {expr: 'col1 + col2', direction: 'ASC'}
    ]), `ORDER BY "col1" DESC,col1 + col2 ASC`);
  });

  it('should apply null positioning', function () {
    assert.equal(orderBy([
      {field: 'col1', direction: 'desc', nulls: 'last'},
      {expr: 'col1 + col2', direction: 'asc', nulls: 'first'}
    ]), `ORDER BY "col1" DESC NULLS LAST,col1 + col2 ASC NULLS FIRST`);
  });

  it('should be case-insensitive about null positioning', function () {
    assert.equal(orderBy([
      {field: 'col1', direction: 'DESC', nulls: 'last'},
      {expr: 'col1 + col2', direction: 'ASC', nulls: 'first'}
    ]), `ORDER BY "col1" DESC NULLS LAST,col1 + col2 ASC NULLS FIRST`);
  });

  it('should apply both cast type and direction', function () {
    assert.equal(orderBy([
      {field: 'col1', type: 'int', direction: 'desc'},
      {expr: 'col1 + col2', type: 'text', direction: 'asc'}
    ]), `ORDER BY ("col1")::int DESC,(col1 + col2)::text ASC`);
  });

  it('should build an order clause from fields with useBody', function () {
    assert.equal(orderBy([
      {field: 'col1', direction: 'asc', type: 'int'},
      {field: 'col2'}
    ], true), `ORDER BY (body->>'col1')::int ASC,body->>'col2' ASC`);
  });

  it('should ignore useBody with exprs', function () {
    assert.equal(orderBy([
      {expr: 'col1 + col2', direction: 'desc', type: 'varchar'}
    ], true), `ORDER BY (col1 + col2)::varchar DESC`);
  });

  it('should process JSON paths', function () {
    assert.equal(orderBy([
      {field: 'jsonobj.element', direction: 'asc'},
      {field: 'jsonarray[1]', direction: 'desc'},
      {field: 'complex.element[0].with.nested.properties', direction: 'asc'}
    ]), `ORDER BY "jsonobj"->>'element' ASC,"jsonarray"->>1 DESC,"complex"#>>'{element,0,with,nested,properties}' ASC`);
  });
});
