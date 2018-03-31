'use strict';

require('co-mocha');

describe('save', function () {
  let db;

  before(function () {
    return resetDb('updatables').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('inserts into a table with a single key', function () {
    return db.normal_pk.save({field1: 'delta'}).then(res => {
      assert.equal(res.id, 4);
    });
  });

  it('inserts into a table with a compound key', function () {
    return db.compound_pk.save({field1: 'delta'}).then(res => {
      assert.equal(res.id1, 4);
      assert.equal(res.id2, 4);
    });
  });

  it('throws if inserting into a table with no key', function () {
    return db.no_pk.save({field1: 'eta', field2: 'theta'}).then(() => {
      assert.fail();
    }).catch(err => {
      assert.isOk(err);
    });
  });

  it('updates a table with a single key', function () {
    return db.normal_pk.save({id: 1, field1: 'omega'}).then(res => {
      assert.equal(res.id, 1);
      assert.equal(res.field1, 'omega');
    });
  });

  it('updates a table with a compound key', function () {
    return db.compound_pk.save({id1: 1, id2: 1, field1: 'omega'}).then(res => {
      assert.equal(res.id1, 1);
      assert.equal(res.id2, 1);
      assert.equal(res.field1, 'omega');
    });
  });

  it('applies options to inserts', function () {
    return db.normal_pk.save({field1: 'omega'}, {build: true}).then(res => {
      assert.deepEqual(res, {
        sql: 'INSERT INTO "normal_pk" ("field1") VALUES ($1) RETURNING *',
        params: ['omega']
      });
    });
  });

  it('applies options to updates', function () {
    return db.normal_pk.save({id: 1, field1: 'omega'}, {build: true}).then(res => {
      assert.deepEqual(res, {
        sql: 'UPDATE "normal_pk" SET "field1" = $1 WHERE "id" = $2 RETURNING *',
        params: ['omega', 1]
      });
    });
  });
});
