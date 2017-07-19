'use strict';

const orderBy = require('../../lib/statement/order-by');

describe('orderBy', function () {
  it('should return an empty string if order is null', function () {
    assert.equal(orderBy(null), '');
  });

  it('should emit an order by for a column string', function () {
    assert.equal(orderBy('name asc'), 'ORDER BY name asc');
  });

  it('should accept an array of sort criteria', function () {
    assert.equal(orderBy([
      {field: 'col1', direction: 'asc'},
      {field: `body->>'col2'`, direction: 'desc', type: 'varchar'},
      {field: 'col3 + col4'}
    ]), `ORDER BY col1 asc,(body->>'col2')::varchar desc,col3 + col4 asc`);
  });

  it('should build an order clause for a document table', function () {
    assert.equal(orderBy([
      {field: 'col1', direction: 'asc', type: 'int'},
      {field: 'col2', direction: 'desc', type: 'varchar'}
    ], true), `ORDER BY (body->>'col1')::int asc,(body->>'col2')::varchar desc`);
  });
});
