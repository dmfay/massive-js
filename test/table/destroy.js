'use strict';

describe('destroy', function () {
  let db;

  before(function () {
    return resetDb().then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('deletes a product', function* () {
    const deleted = yield db.products.destroy({id: 4});
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
    const deleted = yield db.docs.destroy({'body->>title': 'Document 1'});
    assert.equal(deleted.length, 1);

    const found = yield db.docs.find({id: deleted[0].id});
    assert.equal(found.length, 0);
  });

  it('deletes by matching json with whitespace', function* () {
    const deleted = yield db.docs.destroy({'body ->> title': 'Document 2'});
    assert.equal(deleted.length, 1);

    const found = yield db.docs.find({id: deleted[0].id});
    assert.equal(found.length, 0);
  });

  it('deletes by matching json with quotes', function* () {
    const deleted = yield db.docs.destroy({'"body" ->> \'title\'': 'Document 3'});
    assert.equal(deleted.length, 1);

    const found = yield db.docs.find({id: deleted[0].id});
    assert.equal(found.length, 0);
  });

  it('deletes a record from a table with a Cased Name', function* () {
    const deleted = yield db.Users.destroy({Id: 1});
    assert.lengthOf(deleted, 1);
    assert.equal(deleted[0].Id, 1);

    const found = yield db.Users.find(1);
    assert.isNull(found);
  });

  it('deletes a record with a UUID key', function* () {
    const foundBefore = yield db.orders.findOne({});
    assert.isOk(foundBefore);

    const deleted = yield db.orders.destroy({id: foundBefore.id});
    assert.lengthOf(deleted, 1);
    assert.equal(deleted[0].id, foundBefore.id);

    const foundAfter = yield db.orders.findOne({id: foundBefore.id});
    assert.notOk(foundAfter);
  });

  it('applies options', function () {
    return db.products.destroy({id: 1}, {build: true}).then(res => {
      assert.deepEqual(res, {
        sql: 'DELETE FROM "products" WHERE "id" = $1 RETURNING *',
        params: [1]
      });
    });
  });
});
