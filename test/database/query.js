'use strict';

const types = require('pg').types;
const Select = require('../../lib/statement/select');

describe('query', function () {
  let db;

  before(function () {
    return resetDb('singletable').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('runs raw unparameterized SQL', function () {
    return db.query('select * from products').then(res => {
      assert.equal(4, res.length);
    });
  });

  it('runs a simple prepared statement', function () {
    return db.query('select $1 as val', ['hi']).then(result => assert.equal(result[0].val, 'hi'));
  });

  it('runs a prepared statement without parameters', function () {
    return db.query('select 1 as val').then(result => assert.equal(result[0].val, 1));
  });

  it('runs a prepared statement with empty parameters', function () {
    return db.query('select 1 as val', []).then(result => assert.equal(result[0].val, 1));
  });

  it('runs a prepared statement with undefined parameters', function () {
    return db.query('select 1 as val', undefined).then(result => assert.equal(result[0].val, 1));
  });

  it('runs a parameterized prepared statement with an undefined parameter', function () {
    return db.query('select $1 as val', [undefined]).then(result => assert.isNull(result[0].val));
  });

  it('fails to run a parameterized prepared statement with empty parameters', function () {
    return db.query('select $1 as val', []).then(() => assert.fail()).catch(() => {});
  });

  it('does not apply formatting when not required', function () {
    return db.query('select \'$1\' as val').then(result => assert.equal(result[0].val, '$1'));
  });

  it('runs a prepared statement using named parameters', function () {
    return db.query('select * from products where id=${id}', {id: 1}).then(res => {
      assert.equal(1, res[0].id);
    });
  });

  it('applies options and builds a prepared statement without executing', function () {
    return db.query('select $1 as val', ['hi'], {build: true}).then(result => {
      assert.isObject(result);
      assert.deepEqual(result, {sql: 'select $1 as val', params: ['hi']});
    });
  });

  it('decomposes and returns single objects when called for', function () {
    return db.query(
      'select * from products where id=${id}',
      {id: 1},
      {
        single: true,
        decompose: {
          pk: 'id',
          columns: {id: 'id', string: 'aStringColumn'}
        }
      }
    ).then(res => {
      assert.equal(1, res.id);
      assert.equal('one', res.aStringColumn);
    });
  });

  it('changes types', function* () {
    const stringCount = yield db.query('select count(*) from products');

    assert.typeOf(stringCount[0].count, 'string');

    types.setTypeParser(20, parseInt);

    const intCount = yield db.query('select count(*) from products');

    assert.typeOf(intCount[0].count, 'number');

    types.setTypeParser(20, v => v);  // reset
  });

  it('runs a query object', function () {
    const query = new Select(
      {delimitedFullName: `(values ('hi'), ('ih')) temp`, isPkSearch: () => false},
      {column1: 'hi'},
      {fields: ['column1']}
    );

    return db.query(query).then(result => {
      assert.lengthOf(result, 1);
      assert.equal(result[0].column1, 'hi');
    });
  });

  it('builds a query without executing', function () {
    const query = new Select(
      {delimitedFullName: `(values ('hi'), ('ih')) temp`, isPkSearch: () => false},
      {column1: 'hi'},
      {fields: ['column1'], build: true}
    );

    return db.query(query).then(result => {
      assert.isObject(result);
      assert.deepEqual(result, {
        sql: `SELECT "column1" FROM (values ('hi'), ('ih')) temp WHERE "column1" = $1 ORDER BY 1`,
        params: ['hi']
      });
    });
  });
});
