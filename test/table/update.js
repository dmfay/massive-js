'use strict';

describe('update', function () {
  let db;

  before(function () {
    return resetDb('updatables').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  describe('single-object updates', function () {
    it('returns null when updating a nonexistent record', function () {
      return db.normal_pk.update({id: 99999, field1: 'something'}).then(res => {
        assert.isNull(res);
      });
    });

    it('throws when updating a record with operations in the pk field', function () {
      return db.normal_pk.update({
        'id <': 123,
        field1: 'something'
      })
        .then(() => { assert.fail(); })
        .catch(err => {
          assert.isOk(err);
        });
    });

    it('updates a product by the primary key of a single record', function () {
      return db.normal_pk.update({id: 2, field1: 'something'}).then(res => {
        assert.equal(res.id, 2);
        assert.equal(res.field1, 'something');
      });
    });

    it('returns a product when there are no fields to be updated', function () {
      return db.normal_pk.update({id: 1}).then(res => {
        assert.equal(res.id, 1);
        assert.equal(res.field1, 'alpha');
      });
    });

    it('updates an array field', function () {
      return db.normal_pk.update({id: 1, array_field: ['one', 'two']}).then(res => {
        assert.equal(res.id, 1);
        assert.lengthOf(res.array_field, 2);
        assert.deepEqual(res.array_field, ['one', 'two']);
      });
    });

    it('updates an empty array field', function () {
      return db.normal_pk.update({id: 1, array_field: []}).then(res => {
        assert.equal(res.id, 1);
        assert.lengthOf(res.array_field, 0);
      });
    });

    it('updates a record in a table with a Cased Name', function () {
      return db.CasedName.update({Id: 1, Field1: 'Omega'}).then(res => {
        assert.equal(res.Id, 1);
        assert.equal(res.Field1, 'Omega');
      });
    });

    it('applies options', function () {
      return db.normal_pk.update({id: 1, field1: 'omega'}, null, {build: true}).then(res => {
        assert.deepEqual(res, {
          sql: 'UPDATE "normal_pk" SET "field1" = $1 WHERE "id" = $2 RETURNING *',
          params: ['omega', 1]
        });
      });
    });
  });

  describe('bulk updates', function () {
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
});
