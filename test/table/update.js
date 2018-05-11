'use strict';

describe('update', function () {
  let db;

  before(function () {
    return resetDb('updatables').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('updates multiple normal_pk', function () {
    return db.normal_pk.update({'id >': 2}, {field1: 'zeta'}).then(res => {
      assert.equal(res.length, 1);
      assert.equal(res[0].id, 3);
      assert.equal(res[0].field1, 'zeta');
    });
  });

  it('updates all normal_pk', function () {
    return db.normal_pk.update({}, {field1: 'upsilon'}).then(res => {
      assert.equal(res.length, 3);
      assert.isTrue(res.every(r => r.field1 === 'upsilon'));
    });
  });

  it('updates multiple normal_pk with an IN list', function () {
    return db.normal_pk.update({id: [1, 2]}, {field1: 'theta'}).then(res => {
      assert.equal(res.length, 2);
      assert.notEqual(res[0].id, res[1].id);
      assert.isTrue(res.every(r => r.field1 === 'theta'));
    });
  });

  it('updates multiple normal_pk with a NOT IN list', function () {
    return db.normal_pk.update({'id !=': [1, 2]}, {field1: 'tau'}).then(res => {
      assert.equal(res.length, 1);
      assert.equal(res[0].id, 3);
      assert.equal(res[0].field1, 'tau');
    });
  });

  it('returns multiple normal_pk when there are no fields to be updated', function () {
    return db.normal_pk.update({id: [1, 2]}, {}).then(res => {
      assert.isTrue(res.some(r => r.id === 1));
      assert.isTrue(res.some(r => r.id === 2));
    });
  });

  it('applies options', function () {
    return db.normal_pk.update({id: [1, 2]}, {field1: 'iota'}, {build: true}).then(res => {
      assert.deepEqual(res, {
        sql: 'UPDATE "normal_pk" SET "field1" = $1 WHERE "id" IN ($2,$3) RETURNING *',
        params: ['iota', 1, 2]
      });
    });
  });
});
