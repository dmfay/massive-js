'use strict';

describe('save', function () {
  let db;

  before(function () {
    return resetDb().then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('inserts a new product', function () {
    return db.products.save({name: "Gibson Les Paul", description: "Lester's brain child", price: 3500}).then(res => {
      assert.equal(res.id, 5);
    });
  });

  it('updates an existing product', function () {
    const product = {id: 4, name: "Fender Stratocaster", description: "Leo Fender's baby", price: 1200, tags: ['1', '2']};
    db.products.save(product).then(res => {
      assert.equal(product.id, 4);  // should not clobber the original object
      assert.equal(res.id, 4);
      assert.equal(res.name, "Fender Stratocaster");
    });
  });
});
