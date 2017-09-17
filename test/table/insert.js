'use strict';

describe('insert', function () {
  let db;

  before(function () {
    return resetDb().then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('inserts a record and returns an object', function () {
    return db.products.insert({name: 'A Product'}).then(res => {
      assert.equal(res.name, 'A Product');
    });
  });

  it('inserts multiple products and returns an array', function () {
    return db.products.insert([{name: 'A Product'}, {name: 'Another Product'}]).then(res => {
      assert.equal(res.length, 2);
      assert.equal(res[0].name, 'A Product');
      assert.equal(res[1].name, 'Another Product');
    });
  });

  it('combines keys of partial objects on insert', function () {
    return db.products.insert([
      {name: 'A Product', tags: ['this has a tag']},
      {name: 'Another Product', description: 'this has a description', specs: {weight: 10}}
    ]).then(res => {
      assert.equal(res.length, 2);
      assert.equal(res[0].id, 8);
      assert.equal(res[0].name, 'A Product');
      assert.deepEqual(res[0].tags, ['this has a tag']);
      assert.equal(res[1].id, 9);
      assert.equal(res[1].name, 'Another Product');
      assert.deepEqual(res[1].specs, {weight: 10});
    });
  });

  it('throws when a partial record excludes a constrained field', function () {
    return db.products.insert([
      {name: 'A Product', tags: ['this has a tag']},
      {name: 'Another Product', description: 'this has a description', price: 1.23}
    ]).then(() => {
      assert.fail();
    }).catch(() => {});
  });

  it('inserts nothing', function () {
    return db.products.insert([]).then(res => {
      assert.equal(res.length, 0);
    });
  });

  it('inserts array fields', function () {
    return db.products.insert({name: 'A Product', tags: ['one', 'two']}).then(res => {
      assert.equal(res.name, 'A Product');
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
    return db.Users.insert({Email: 'foo@bar.com', Name: 'Another test user'}).then(res => {
      assert.equal(res.Id, 2);
      assert.equal(res.Email, 'foo@bar.com');
    });
  });

  it('returns an error when a constraint is violated', function () {
    return db.products.insert({name: null}).catch(err => {
      assert.equal(err.code, '23502');
      assert.isOk(err.detail);
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
