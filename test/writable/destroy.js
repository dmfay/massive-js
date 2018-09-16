'use strict';

describe('destroy', function () {
  let db;

  before(function () {
    return resetDb('singletable').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('deletes a product and returns a record', function* () {
    const deleted = yield db.products.destroy(3);
    assert.equal(deleted.id, 3);

    const found = yield db.products.find(3);
    assert.isNull(found);
  });

  it('deletes a product by criteria and returns an array', function* () {
    const deleted = yield db.products.destroy({id: 4});
    assert.lengthOf(deleted, 1);
    assert.equal(deleted[0].id, 4);

    const found = yield db.products.find(4);
    assert.isNull(found);
  });

  it('deletes all products and returns an array', function* () {
    const deleted = yield db.products.destroy({});
    assert.lengthOf(deleted, 2);

    const found = yield db.products.find({});
    assert.equal(found.length, 0);
  });

  it('deletes by matching json', function* () {
    yield db.products.insert({string: 'five', specs: {title: 'Document 1'}});
    const deleted = yield db.products.destroy({'specs.title': 'Document 1'});
    assert.lengthOf(deleted, 1);

    const found = yield db.products.find({id: deleted[0].id});
    assert.equal(found.length, 0);
  });

  it('deletes by matching json with quotes', function* () {
    yield db.products.insert({string: 'five', specs: {title: 'Document 1'}});
    const deleted = yield db.products.destroy({'"specs".title': 'Document 1'});
    assert.lengthOf(deleted, 1);

    const found = yield db.products.find({id: deleted[0].id});
    assert.equal(found.length, 0);
  });

  it('deletes a record from a table with a Cased Name', function* () {
    const index = yield db.products.insert({CaseName: 'FourTeen', string: 'fourteen'});
    const deleted = yield db.products.destroy({CaseName: 'FourTeen'});
    assert.lengthOf(deleted, 1);
    assert.equal(deleted[0].CaseName, 'FourTeen');

    const found = yield db.products.find(index);
    assert.lengthOf(found, 0);
  });

  it('deletes a record with a UUID key', function* () {
    const foundBefore = yield db.products.insert({string: 'five', specs: {title: 'Document 1'}});
    assert.isOk(foundBefore);

    const deleted = yield db.products.destroy({uuid: foundBefore.uuid});
    assert.lengthOf(deleted, 1);
    assert.equal(deleted[0].uuid, foundBefore.uuid);

    const foundAfter = yield db.products.findOne({uuid: foundBefore.uuid});
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

  it('restricts returned fields', function* () {
    const product = yield db.products.insert({string: 'six'});
    const res = yield db.products.destroy({id: product.id}, {fields: ['id']});

    assert.lengthOf(Object.keys(res[0]), 1);
    assert.equal(res[0].id, product.id);
  });
});
