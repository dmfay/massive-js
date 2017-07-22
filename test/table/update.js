'use strict';

describe('update', function () {
  let db;

  before(function () {
    return resetDb().then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  describe('single-object updates', function () {
    it('returns null when updating a record with an invalid primary key', function () {
      return db.products.update({id: 99999, name: 'new and improved product 4'}).then(res => {
        assert.isNull(res);
      });
    });

    it('updates a product by the primary key of a single record', function () {
      return db.products.update({id: 4, name: 'new and improved product 4'}).then(res => {
        assert.equal(res.id, 4);
        assert.equal(res.name, 'new and improved product 4');
      });
    });

    it('returns a product when there are no fields to be updated', function () {
      return db.products.update({id: 1}).then(res => {
        assert.equal(res.id, 1);
        assert.equal(res.name, 'Product 1');
      });
    });

    it('updates a record in a table with a Cased Name', function () {
      return db.Users.update({Id: 1, Email: "bar@foo.com"}).then(res => {
        assert.equal(res.Id, 1);
        assert.equal(res.Email, "bar@foo.com");
      });
    });

    it('applies options', function () {
      return db.products.update({id: 1, name: 'another kind of product'}, null, {build: true}).then(res => {
        assert.deepEqual(res, {
          sql: 'UPDATE "products" SET "name" = $1 WHERE "id" = $2 RETURNING *',
          params: ['another kind of product', 1]
        });
      });
    });
  });

  describe('bulk updates', function () {
    it('updates multiple products', function () {
      return db.products.update({in_stock: true}, {in_stock: false}).then(res => {
        assert.equal(res.length, 2);
        assert.notEqual(res[0].id, res[1].id);
        assert.isFalse(res[0].in_stock);
        assert.isFalse(res[1].in_stock);
      });
    });

    it('updates all products', function () {
      return db.products.update({}, {price: 1.23}).then(res => {
        assert.equal(res.length, 4);
        assert.equal(res[0].price, 1.23);
        assert.equal(res[1].price, 1.23);
        assert.equal(res[2].price, 1.23);
        assert.equal(res[3].price, 1.23);
      });
    });

    it('updates products with predicates of varying length', function () {
      return db.products.update({'specs !=': null}, {price: 1.23}).then(res => {
        assert.equal(res.length, 3);
        assert.equal(res[0].price, 1.23);
        assert.equal(res[1].price, 1.23);
        assert.equal(res[2].price, 1.23);
      });
    });

    it('updates multiple products with an IN list', function () {
      return db.products.update({id: [1, 2]}, {price: 123.45}).then(res => {
        assert.equal(res.length, 2);
        assert.notEqual(res[0].id, res[1].id);
        assert.equal(res[0].price, 123.45);
        assert.equal(res[1].price, 123.45);
      });
    });

    it('updates multiple products with a NOT IN list', function () {
      return db.products.update({'id !=': [1, 2]}, {price: 543.21}).then(res => {
        assert.equal(res.length, 2);
        assert.notEqual(res[0].id, res[1].id);
        assert.equal(res[0].price, 543.21);
        assert.equal(res[1].price, 543.21);
      });
    });

    it('returns multiple products when there are no fields to be updated', function () {
      return db.products.update({id: [1, 2]}, {}).then(res => {
        assert.equal(res[0].id, 1);
        assert.equal(res[0].name, 'Product 1');
      });
    });

    it('applies options', function () {
      return db.products.update({id: [1, 2]}, {name: 'another kind of product'}, {build: true}).then(res => {
        assert.deepEqual(res, {
          sql: 'UPDATE "products" SET "name" = $1 WHERE "id" IN ($2,$3) RETURNING *',
          params: ['another kind of product', 1, 2]
        });
      });
    });
  });
});
