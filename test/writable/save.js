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

  it('returns null when updating a nonexistent record', function () {
    return db.normal_pk.save({id: 99999, field1: 'something'}).then(res => {
      assert.isNull(res);
    });
  });

  it('rejects when updating a record with operations in the pk field', function () {
    return db.normal_pk.save({
      'id <': 123,
      field1: 'something'
    })
      .then(() => { assert.fail(); })
      .catch(err => {
        assert.isOk(err);
      });
  });

  it('returns a product when there are no fields to be updated', function () {
    return db.normal_pk.save({id: 1}).then(res => {
      assert.equal(res.id, 1);
      assert.equal(res.field1, 'alpha');
    });
  });

  it('inserts into a table with a single key', function () {
    return db.normal_pk.save({field1: 'delta'}).then(res => {
      assert.equal(res.id, 5);
    });
  });

  it('inserts into a table with a compound key', function () {
    return db.compound_pk.save({field1: 'delta'}).then(res => {
      assert.equal(res.id1, 4);
      assert.equal(res.id2, 4);
    });
  });

  it('cannot insert into a writable view', function () {
    return db.normal_as.save({field1: 'upsilon'})
      .then(() => { assert.fail(); })
      .catch(err => {
        assert.equal(err.message, 'normal_as has no primary key, use insert or update to write to this table');
      });
  });

  it('rejects if inserting into a table with no key', function () {
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

  it('updates an array field', function () {
    return db.normal_pk.save({id: 1, array_field: ['one', 'two']}).then(res => {
      assert.equal(res.id, 1);
      assert.lengthOf(res.array_field, 2);
      assert.deepEqual(res.array_field, ['one', 'two']);
    });
  });

  it('updates an empty array field', function () {
    return db.normal_pk.save({id: 1, array_field: []}).then(res => {
      assert.equal(res.id, 1);
      assert.lengthOf(res.array_field, 0);
    });
  });

  it('updates a record in a table with a Cased Name', function () {
    return db.CasedName.save({Id: 1, Field1: 'Omega'}).then(res => {
      assert.equal(res.Id, 1);
      assert.equal(res.Field1, 'Omega');
    });
  });

  it('cannot update a writable view', function () {
    return db.normal_as.save({id: 1, field1: 'upsilon'})
      .then(() => { assert.fail(); })
      .catch(err => {
        assert.equal(err.message, 'normal_as has no primary key, use insert or update to write to this table');
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

  it('rejects if changes are not an object', function () {
    return db.normal_pk.save('eta')
      .then(() => { assert.fail(); })
      .catch(err => {
        assert.equal(err.message, 'Must provide an object with all fields being modified and the primary key if updating');
      });
  });

  it('rejects if changes are an array', function () {
    return db.normal_pk.save([{id: 1, field1: 'zeta'}])
      .then(() => { assert.fail(); })
      .catch(err => {
        assert.equal(err.message, 'Must provide an object with all fields being modified and the primary key if updating');
      });
  });
});
