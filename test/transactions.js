'use strict';

let db;

describe('transactions', function () {
  beforeEach(function () {
    return resetDb('loader').then(instance => db = instance);
  });

  afterEach(function () {
    return db.instance.$pool.end();
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

  it('does things in a tagged transaction', function () {
    return db.transaction('mytag', () => {
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

  it('does things in a tagged transaction and includes a custom mode', function () {
    const TransactionMode = db.pgp.txMode.TransactionMode;
    const isolationLevel = db.pgp.txMode.isolationLevel;

    return db.transaction('mytag', () => {
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
    return db.t1.count({}).then(c => {
      assert.equal(c, 0);

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

  it('rolls back a transaction through the driver', function () {
    return db.t1.count({}).then(c => {
      assert.equal(c, 0);

      return db.instance.tx(() => {
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
});
