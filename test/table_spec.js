'use strict';
describe('Tables', function () {
  let db;

  function init() {
    return resetDb().then(instance => db = instance);
  }

  describe("Executing inline SQL", function () {
    before(init);

    it('with run and no args returns 4 products', function () {
      return db.run("select * from products").then(res => {
        assert.equal(4, res.length);
      });
    });

    it('with run and id returns Product 1', function () {
      return db.run("select * from products where id=$1", [1]).then(res => {
        assert.equal(1, res[0].id);
      });
    });
  });

  describe('save', function () {
    before(init);

    it('adds a product ', function () {
      return db.products.save({name : "Gibson Les Paul", description : "Lester's brain child", price : 3500}).then(res => {
        assert.equal(res.id, 5);
      });
    });

    it('updates a product', function () {
      const product = {id : 4, name : "Fender Stratocaster", description : "Leo Fender's baby", price : 1200, tags: ['1', '2']};
      db.products.save(product).then(res => {
        assert.equal(product.id, 4);  // should not clobber the original object
        assert.equal(res.id, 4);
        assert.equal(res.name, "Fender Stratocaster");
      });
    });
  });

  describe('insert', function () {
    before(init);

    it('inserts a product', function () {
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

    describe('violating a constraint', function () {
      it('returns a useful error', function() {
        return db.products.insert({name: null}).catch(err => {
          assert.equal(err.code, '23502');
          assert.notEqual(err.detail, undefined);
        });
      });
    });
  });

  describe('update', function () {
    before(init);

    it('updates multiple products', function () {
      return db.products.update({in_stock: true}, {in_stock: false}).then(res => {
        assert.equal(res.length, 2);
        assert.equal(res[0].id, 1);
        assert.equal(res[0].in_stock, false);
        assert.equal(res[1].id, 2);
        assert.equal(res[1].in_stock, false);
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
        assert.equal(res[0].id, 1);
        assert.equal(res[0].price, 123.45);
        assert.equal(res[1].id, 2);
        assert.equal(res[1].price, 123.45);
      });
    });

    it('updates multiple products with a NOT IN list', function () {
      return db.products.update({'id !=': [1, 2]}, {price: 543.21}).then(res => {
        assert.equal(res.length, 2);
        assert.equal(res[0].id, 3);
        assert.equal(res[0].price, 543.21);
        assert.equal(res[1].id, 4);
        assert.equal(res[1].price, 543.21);
      });
    });

    it('returns a product when there are no fields to be updated', function () {
      return db.products.update({id: 1}).then(res => {
        assert.equal(res.id, 1);
        assert.equal(res.name, 'Product 1');
      });
    });

    it('returns multiple products when there are no fields to be updated', function () {
      return db.products.update({id: [1, 2]}, {}).then(res => {
        assert.equal(res[0].id, 1);
        assert.equal(res[0].name, 'Product 1');
      });
    });
  });

  describe('destroy', function () {
    before(init);

    it('deletes a product', function* () {
      const deleted = yield db.products.destroy({id : 4});
      assert.lengthOf(deleted, 1);
      assert.equal(deleted[0].id, 4);

      const found = yield db.products.find(4);
      assert.isNull(found);
    });

    it('deletes all products', function* () {
      const deleted = yield db.products.destroy({});
      assert.equal(deleted.length, 3);

      const found = yield db.products.find({});
      assert.equal(found.length, 0);
    });

    it('deletes by matching json', function* () {
      const deleted = yield db.docs.destroy({'body->>title': 'A Document'});
      assert.equal(deleted.length, 1);

      const found = yield db.docs.find({id: deleted[0].id});
      assert.equal(found.length, 0);
    });

    it('deletes by matching json with whitespace', function* () {
      const deleted = yield db.docs.destroy({'body ->> title': 'Another Document'});
      assert.equal(deleted.length, 1);

      const found = yield db.docs.find({id: deleted[0].id});
      assert.equal(found.length, 0);
    });

    it('deletes by matching json with quotes', function* () {
      const deleted = yield db.docs.destroy({'"body" ->> \'title\'': 'Starsky and Hutch'});
      assert.equal(deleted.length, 1);

      const found = yield db.docs.find({id: deleted[0].id});
      assert.equal(found.length, 0);
    });
  });

  describe('Add/Update/Delete records with nonstandard casing:', function() {
    before(init);

    it('adds a User', function () {
      return db.Users.save({Email : "foo@bar.com", Name: "Another test user"}).then(res => {
        assert.equal(res.Id, 2);
        assert.equal(res.Email, "foo@bar.com");
      });
    });

    it('updates a User', function () {
      return db.Users.save({Id : 2, Email : "bar@foo.com"}).then(res => {
        assert.equal(res.Id, 2);
        assert.equal(res.Email, "bar@foo.com");
      });
    });

    it('deletes a User', function* () {
      const deleted = yield db.Users.destroy({Id : 2});
      assert.lengthOf(deleted, 1);
      assert.equal(deleted[0].Id, 2);

      const found = yield db.Users.find(2);
      assert.isNull(found);
    });
  });

  describe('Add/Update/Delete records with UUID keys:', function() {
    before(init);

    it('adds an order', function () {
      return db.orders.save({product_id: 1, user_id: 1, notes: 'hi'}).then(res => {
        assert.ok(res.id !== null);
        assert.equal(res.product_id, 1);
        assert.equal(res.user_id, 1);
        assert.equal(res.notes, 'hi');
      });
    });

    it('updates an order', function* () {
      const found = yield db.orders.findOne({});
      found.notes = 'hello';

      const res = yield db.orders.save(found);
      assert.equal(res.id, found.id);
      assert.equal(res.notes, 'hello');
    });

    it('deletes an order', function* () {
      const found = yield db.orders.findOne({});
      assert.isOk(found);

      const deleted = yield db.orders.destroy({id : found.id});
      assert.lengthOf(deleted, 1);
      assert.equal(deleted[0].id, found.id);

      const remaining = yield db.orders.findOne({id : found.id});
      assert.lengthOf(remaining, 0);
    });
  });
});
