'use strict';

const Select = require('../../lib/statement/select');

describe('query', function() {
  let db;

  before(function() {
    return resetDb('empty').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
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
    const query = new Select(
      {delimitedFullName: `(values ('hi'), ('ih')) temp`, isPkSearch: () => false},
      {column1: 'hi'},
      {columns: ['column1']}
    );

    return db.query(query).then(result => {
      assert.lengthOf(result, 1);
      assert.equal(result[0].column1, 'hi');
    });
  });

  it('builds a query without executing', function() {
    const query = new Select(
      {delimitedFullName: "(values ('hi'), ('ih')) temp", isPkSearch: () => false},
      {column1: 'hi'},
      {columns: ['column1'], build: true}
    );

    return db.query(query).then(result => {
      assert.isObject(result);
      assert.deepEqual(result, {
        sql: `SELECT column1 FROM (values ('hi'), ('ih')) temp WHERE "column1" = $1 ORDER BY 1`,
        params: ['hi']
      });
    });
  });
});
