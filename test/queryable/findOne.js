'use strict';

describe('findOne', function () {
  let db;

  before(function() {
    return resetDb().then(instance => db = instance);
  });

  describe('all records', function () {
    it('returns first record with findOne no args', function () {
      return db.products.findOne().then(res => assert.equal(res.id, 1));
    });
  });

  describe('primary keys', function () {
    it('findOnes by a numeric key and returns a result object', function () {
      return db.products.findOne(1).then(res => {
        assert.isObject(res);
        assert.equal(res.id, 1);
      });
    });

    it('findOnes by a string/uuid key and returns a result object', function* () {
      const order = yield db.orders.findOne();
      assert.isOk(order);

      const res = yield db.orders.findOne(order.id);
      assert.equal(res.id, order.id);
    });
  });

  describe('no records', function () {
    it('returns undefined with a primary key', function () {
      return db.products.findOne(35565).then(res => assert.isUndefined(res));
    });

    it('returns undefined with a criteria object', function () {
      return db.products.findOne({id: 35565}).then(res => assert.isUndefined(res));
    });
  });
});
