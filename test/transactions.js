'use strict';

describe('transactions', function () {
  let db;

  before(function () {
    return resetDb('singletable').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('runs queries in transactions', function () {
    return db.withTransaction(tx => {
      let promise = tx.products.insert({string: 'alpha'});

      promise = promise.then(record => {
        assert.isOk(record);
        assert.isTrue(record.id > 0);
        assert.equal(record.string, 'alpha');

        return tx.products.save({id: record.id, description: 'test'});
      });

      return promise;
    }).then(record => {
      assert.isOk(record);
      assert.isTrue(record.id > 0);
      assert.equal(record.string, 'alpha');
      assert.equal(record.description, 'test');

      return db.products.find(record.id).then(persisted => {
        assert.isOk(persisted);
      });
    });
  });

  it('applies options', function () {
    return db.withTransaction(tx => {
      let promise = tx.products.insert({string: 'alpha'});

      promise = promise.then(record => {
        assert.isOk(record);
        assert.isTrue(record.id > 0);
        assert.equal(record.string, 'alpha');

        return tx.products.save({id: record.id, description: 'test'});
      });

      return promise;
    }, {
      mode: new db.pgp.txMode.TransactionMode({
        tiLevel: db.pgp.txMode.isolationLevel.serializable
      })
    }).then(record => {
      assert.isOk(record);
      assert.isTrue(record.id > 0);
      assert.equal(record.string, 'alpha');
      assert.equal(record.description, 'test');

      return db.products.find(record.id).then(persisted => {
        assert.isOk(persisted);
      });
    });
  });

  it('rolls back if anything rejects', function () {
    let total;

    return db.products.count().then(count => {
      total = count;

      return Promise.resolve();
    }).then(() => {
      return db.withTransaction(tx => {
        let promise = tx.products.insert({string: 'beta'});

        promise = promise.then(record => {
          assert.isOk(record);
          assert.isTrue(record.id > 0);
          assert.equal(record.string, 'beta');

          return tx.products.save({id: 'not an int', description: 'test'});
        });

        return promise;
      }).then(() => {
        assert.fail();
      }).catch(err => {
        assert.isOk(err);
        assert.equal(err.code, '22P02');

        return db.products.count().then(count => {
          assert.equal(count, total);
        });
      });
    });
  });
});
