'use strict';

const types = require('pg').types;

describe('run', function () {
  let db;

  before(function () {
    return resetDb('singletable').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('runs raw unparameterized SQL', function () {
    return db.run('select * from products').then(res => {
      assert.equal(4, res.length);
    });
  });

  it('prepares and runs a statement', function () {
    return db.run('select * from products where id=$1', [1]).then(res => {
      assert.equal(1, res[0].id);
    });
  });

  it('uses named parameters', function () {
    return db.run('select * from products where id=${id}', {id: 1}).then(res => {
      assert.equal(1, res[0].id);
    });
  });

  it('changes types', function* () {
    const stringCount = yield db.run('select count(*) from products');

    assert.typeOf(stringCount[0].count, 'string');

    types.setTypeParser(20, parseInt);

    const intCount = yield db.run('select count(*) from products');

    assert.typeOf(intCount[0].count, 'number');

    types.setTypeParser(20, v => v);  // reset
  });
});
