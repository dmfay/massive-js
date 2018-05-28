'use strict';

describe('deep insert', function () {
  let db;

  before(function () {
    return resetDb('data-products-orders').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('is off by default', function* () {
    const res = yield db.products.insert({
      name: 'something',
      orders: [{
        product_id: undefined,
        user_id: 5,
        notes: 'deep insert test'
      }]
    });

    assert.equal(res.name, 'something');

    const orders = yield db.orders.find({product_id: res.id});

    assert.lengthOf(orders, 0);
  });

  it('inserts a product and an order in one go', function* () {
    const res = yield db.products.insert({
      name: 'something',
      orders: [{
        product_id: undefined,
        user_id: 5,
        notes: 'deep insert test'
      }]
    }, {
      deepInsert: true
    });

    assert.equal(res.name, 'something');

    const orders = yield db.orders.find({product_id: res.id});

    assert.lengthOf(orders, 1);
    assert.equal(orders[0].user_id, 5);
    assert.equal(orders[0].notes, 'deep insert test');
  });

  it('inserts a product and multiple orders in one go', function* () {
    const res = yield db.products.insert({
      name: 'something',
      orders: [{
        product_id: undefined,
        user_id: 5,
        notes: 'deep insert test 1'
      }, {
        product_id: undefined,
        user_id: 6,
        notes: 'deep insert test 2'
      }]
    }, {
      deepInsert: true
    });

    assert.equal(res.name, 'something');

    const orders = yield db.orders.find({product_id: res.id});

    assert.lengthOf(orders, 2);

    const order1 = orders.find(o => o.user_id === 5);
    assert.equal(order1.notes, 'deep insert test 1');

    const order2 = orders.find(o => o.user_id === 6);
    assert.equal(order2.notes, 'deep insert test 2');
  });

  it('builds the expected sql', function () {
    return db.products.insert({
      name: 'something',
      orders: [{
        product_id: undefined,
        user_id: 5,
        notes: 'deep insert test'
      }]
    }, {
      build: true,
      deepInsert: true
    }).then(res => {
      assert.equal(res.sql, 'WITH inserted AS (INSERT INTO "products" ("name") VALUES ($1) RETURNING *), q_0_0 AS (INSERT INTO "orders" ("product_id", "user_id", "notes") SELECT "id", $2, $3 FROM inserted) SELECT * FROM inserted');
      assert.deepEqual(res.params, ['something', 5, 'deep insert test']);
    });
  });

  it('errors on attempting to deep insert multiple records', function () {
    return db.products.insert([{
      name: 'something',
      orders: [{
        product_id: undefined,
        user_id: 5,
        notes: 'deep insert test 1'
      }, {
        product_id: undefined,
        user_id: 6,
        notes: 'deep insert test 2'
      }]
    }, {
      name: 'something else',
      orders: [{
        product_id: undefined,
        user_id: 6,
        notes: 'deep insert test 3'
      }]
    }])
      .then(() => { assert.fail(); })
      .catch(() => {});
  });

  it('errors if a junction is erroneously detected', function () {
    return db.products.insert([{
      name: 'something',
      not_a_column: 'junction false positive'
    }])
      .then(() => { assert.fail(); })
      .catch(() => {});
  });
});
