'use strict';

describe('update', function () {
  let db;

  before(function () {
    return resetDb('updatables').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('does nothing without changes and returns an array', function () {
    return db.normal_pk.update({id: 1}, {}).then(res => {
      assert.equal(res.length, 1);
      assert.equal(res[0].id, 1);
      assert.equal(res[0].field1, 'alpha');
    });
  });

  it('does nothing without changes and returns an object for unary updates', function () {
    return db.normal_pk.update(1, {}).then(res => {
      assert.equal(res.id, 1);
      assert.equal(res.field1, 'alpha');
    });
  });

  it('updates a single record by primary key', function () {
    return db.normal_pk.update(1, {field1: 'zeta'}).then(res => {
      assert.equal(res.id, 1);
      assert.equal(res.field1, 'zeta');
    });
  });

  it('updates records by criteria', function () {
    return db.normal_pk.update({'id >': 2}, {field1: 'eta'}).then(res => {
      assert.equal(res.length, 1);
      assert.equal(res[0].id, 3);
      assert.equal(res[0].field1, 'eta');
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
      assert.lengthOf(res, 1);
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

  it('restricts returned fields', function () {
    return db.normal_pk.update({id: [1, 2]}, {field1: 'iota'}, {fields: ['field2']}).then(res => {
      assert.isUndefined(res[0].field1);
      assert.isNull(res[0].field2);
    });
  });

  it('updates a writable view', function* () {
    yield db.normal_pk.insert({field1: 'alfalfa'});

    const res = yield db.normal_as.update({field1: 'alfalfa'}, {field1: 'upsilon'});

    assert.lengthOf(res, 1);
    assert.equal(res[0].field1, 'upsilon');
  });

  it('rejects if not insertable', function* () {
    let caught = false;

    try {
      db.normal_pk.insertable = false;

      yield db.normal_pk.update({id: 1}, {field1: 'theta'});
    } catch (err) {
      caught = true;

      assert.equal(err.message, 'normal_pk is not writable');
    } finally {
      db.normal_pk.insertable = true;

      if (!caught) {
        assert.fail();
      }
    }
  });

  it('rejects if changes are not an object', function () {
    return db.normal_pk.update({id: 1}, 'eta')
      .then(() => { assert.fail(); })
      .catch(err => {
        assert.equal(err.message, 'Update requires a hash of fields=>values to update to');
      });
  });

  it('rejects if changes are an array', function () {
    return db.normal_pk.update({id: 1}, ['eta'])
      .then(() => { assert.fail(); })
      .catch(err => {
        assert.equal(err.message, 'Update requires a hash of fields=>values to update to');
      });
  });
});
