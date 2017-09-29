'use strict';

const orderBy = require('../../lib/statement/order-by');

describe('orderBy', function () {
  it('should return an empty string if order is null or undefined', function () {
    assert.equal(orderBy(null), '');
    assert.equal(orderBy(), '');
  });

  it('should interpolate strings directly', function () {
    assert.equal(orderBy('name asc, type desc'), 'ORDER BY name asc, type desc');
  });

  it('should build an order clause from an array of sort criteria', function () {
    assert.equal(orderBy([
      {field: 'col1'},
      {field: 'col2'}
    ]), `ORDER BY "col1" asc,"col2" asc`);
  });

  it('should apply cast types', function () {
    assert.equal(orderBy([
      {field: 'col1', type: 'int'},
      {field: 'col2', type: 'text'}
    ]), `ORDER BY ("col1")::int asc,("col2")::text asc`);
  });

  it('should apply directions', function () {
    assert.equal(orderBy([
      {field: 'col1', direction: 'desc'},
      {field: 'col2', direction: 'asc'}
    ]), `ORDER BY "col1" desc,"col2" asc`);
  });

  it('should not quote fields if specified', function () {
    assert.equal(orderBy([
      {field: 'col1'},
      {field: 'col2 + col3', raw: true}
    ]), `ORDER BY "col1" asc,col2 + col3 asc`);
  });

  it('should apply both cast type and direction', function () {
    assert.equal(orderBy([
      {field: 'col1', type: 'int', direction: 'desc'},
      {field: 'col2', type: 'text', direction: 'asc'}
    ]), `ORDER BY ("col1")::int desc,("col2")::text asc`);
  });

  it('should build an order clause for a document table', function () {
    assert.equal(orderBy([
      {field: 'col1', direction: 'asc', type: 'int'},
      {field: 'col2', direction: 'desc', type: 'varchar'}
    ], true), `ORDER BY (body->>'col1')::int asc,(body->>'col2')::varchar desc`);
  });

  it('should process JSON paths', function () {
    assert.equal(orderBy([
      {field: 'jsonobj.element', direction: 'asc'},
      {field: 'jsonarray[1]', direction: 'desc'},
      {field: 'complex.element[0].with.nested.properties', direction: 'asc'}
    ]), `ORDER BY "jsonobj"->>'element' asc,"jsonarray"->>1 desc,"complex"#>>'{element,0,with,nested,properties}' asc`);
  });
});
