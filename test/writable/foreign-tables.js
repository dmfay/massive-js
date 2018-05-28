'use strict';

describe('foreign tables', function () {
  let db;

  before(function () {
    return resetDb('foreign-tables').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('loads foreign tables', function () {
    assert.isOk(db.foreigntable);
  });

  it('queries foreign tables', function () {
    return db.foreigntable.find({}).then(res => assert.equal(res.length, 0));
  });

  it('sees updated information in foreign tables', function* () {
    yield db.t1.insert({id: 1});

    const res = yield db.foreigntable.find({});

    assert.equal(res.length, 1);
    assert.equal(res[0].id, 1);
  });

  it('cannot save to foreign tables', function () {
    return db.foreigntable.save({id: 1})
      .then(() => { assert.fail(); })
      .catch(err => {
        assert.equal(err.message, 'foreigntable has no primary key, use insert or update to write to this table');
      });
  });

  it('inserts into foreign tables', function () {
    return db.foreigntable.insert({id: 12345})
      .then(res => { assert.equal(res.id, 12345); });
  });

  it('updates foreign tables', function () {
    return db.foreigntable.update({id: 1}, {id: 999})
      .then(res => {
        assert.lengthOf(res, 1);
        assert.equal(res[0].id, 999);
      });
  });
});
