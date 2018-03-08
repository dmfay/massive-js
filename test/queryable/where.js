'use strict';

describe('where', function () {
  let db;

  before(function () {
    return resetDb('singletable').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('executes a handwritten WHERE clause', function () {
    return db.products.where('id=$1 OR id=$2', [1, 2]).then(res => assert.lengthOf(res, 2));
  });

  it('executes a handwritten WHERE clause with options', function () {
    return db.products.where('id=$1 OR id=$2', [1, 2], {order: [{field: 'id', direction: 'desc'}]}).then(res => {
      assert.lengthOf(res, 2);

      assert.equal(res[0].id, 2);
      assert.equal(res[1].id, 1);
    });
  });

  it('executes a handwritten where clause with a raw param', function () {
    return db.products.where('id=$1', 1).then(res => assert.lengthOf(res, 1));
  });

  it('uses named parameters', function () {
    return db.products.where('id=${id}', {id: 1}).then(res => assert.lengthOf(res, 1));
  });
});
