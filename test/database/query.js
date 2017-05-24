'use strict';

const Query = require('../../lib/query/query');

describe('query', function() {
  let db;

  before(function() {
    return resetDb('empty').then(instance => db = instance);
  });

  it('runs a simple query', function() {
    return db.query('select $1 as val', ['hi']).then(result => assert.equal(result[0].val, 'hi'));
  });

  it('builds a simple query without executing', function() {
    return db.query('select $1 as val', ['hi'], {build: true}).then(result => {
      assert.isObject(result);
      assert.deepEqual(result, {sql: 'select $1 as val', params: ['hi']});
    });
  });

  it('runs a query', function() {
    const query = new Query({column1: 'hi'}, {columns: ['column1']}, {delimitedFullName: `(values ('hi'), ('ih')) temp`});

    return db.query(query).then(result => {
      assert.lengthOf(result, 1);
      assert.equal(result[0].column1, 'hi');
    });
  });

  it('builds a query without executing', function() {
    const query = new Query(
      {column1: 'hi'},
      {columns: ['column1'], build: true},
      {delimitedFullName: "(values ('hi'), ('ih')) temp"
    });

    return db.query(query).then(result => {
      assert.isObject(result);
      assert.deepEqual(result, {
        sql: `SELECT column1 FROM (values ('hi'), ('ih')) temp\nWHERE "column1" = $1 order by 1`,
        params: ['hi']
      });
    });
  });
});
