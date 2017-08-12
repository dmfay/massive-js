'use strict';

describe('insert', function () {
  let db;

  before(function () {
    return resetDb().then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('inserts a record', function () {
    return db.products.insert({name: "A Product"}).then(res => {
      assert.equal(res.name, "A Product");
    });
  });

  it('inserts multiple products', function () {
    return db.products.insert([{name: "A Product"}, {name: "Another Product"}]).then(res => {
      assert.equal(res.length, 2);
      assert.equal(res[0].name, "A Product");
      assert.equal(res[1].name, "Another Product");
    });
  });

  it('inserts nothing', function () {
    return db.products.insert([]).then(res => {
      assert.equal(res.length, 0);
    });
  });

  it('inserts array fields', function () {
    return db.products.insert({name: "A Product", tags: ['one', 'two']}).then(res => {
      assert.equal(res.name, "A Product");
      assert.deepEqual(res.tags, ['one', 'two']);
    });
  });

  it('inserts a record with a UUID key', function () {
    return db.orders.insert({product_id: 1, user_id: 1, notes: 'hi'}).then(res => {
      assert.isOk(res.id);
      assert.equal(res.product_id, 1);
      assert.equal(res.user_id, 1);
      assert.equal(res.notes, 'hi');
    });
  });

  it('inserts a record into a table with a Cased Name', function () {
    return db.Users.insert({Email: "foo@bar.com", Name: "Another test user"}).then(res => {
      assert.equal(res.Id, 2);
      assert.equal(res.Email, "foo@bar.com");
    });
  });

  it('returns an error when a constraint is violated', function() {
    return db.products.insert({name: null}).catch(err => {
      assert.equal(err.code, '23502');
      assert.notEqual(err.detail, undefined);
    });
  });

  it('applies options', function () {
    return db.products.insert({name: 'another kind of product'}, {build: true}).then(res => {
      assert.deepEqual(res, {
        sql: 'INSERT INTO "products" ("name") VALUES ($1) RETURNING *',
        params: ['another kind of product']
      });
    });
  });
});
