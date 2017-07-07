'use strict';

let db;

describe('transactions', function () {
  beforeEach(function () {
    return resetDb('loader').then(instance => db = instance);
  });

  it('does things in a transaction', function () {
    return db.transaction(() => {
      return Promise.all([
        db.t1.insert({id: 1}),
        db.t2.insert({id: 1}),
      ]);
    }).then(() => {
      return db.t1.count({}).then(count => {
        assert.equal(count, 1);
      });
    });
  });

  it('does things in a transaction and includes a custom mode', function () {
    const TransactionMode = db.pgp.txMode.TransactionMode;
    const isolationLevel = db.pgp.txMode.isolationLevel;

    return db.transaction(() => {
      return Promise.all([
        db.t1.insert({id: 1}),
        db.t2.insert({id: 1}),
      ]);
    }, new TransactionMode({tiLevel: isolationLevel.serializable})).then(() => {
      return db.t1.count({}).then(count => {
        assert.equal(count, 1);
      });
    });
  });

  it('rolls back a transaction', function () {
    return db.transaction(() => {
      return Promise.all([
        db.t1.insert({id: 1}),
        db.t2.insert({id: 1}),
        Promise.reject(new Error('not today!'))
      ]);
    }).then(() => {
      assert.fail();
    }).catch(() => {
      return db.t1.count({}).then(count => {
        assert.equal(count, 0);
      });
    });
  });
});
