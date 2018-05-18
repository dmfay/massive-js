'use strict';

describe('updateDoc', function () {
  let db;
  let newDoc = {};

  before(function () {
    return resetDb('singletable')
      .then(instance => db = instance)
      .then(() => {
        return db.saveDoc('docs', {name: 'foo'});
      })
      .then(doc => newDoc = doc);
  });

  after(function () {
    return db.docs.destroy({id: newDoc.id}).then(() => {
      return db.instance.$pool.end();
    });
  });

  it('adds new information to the document', function () {
    return db.docs.updateDoc(newDoc.id, {score: 99}).then(doc => {
      assert.equal(doc.name, 'foo');
      assert.equal(doc.score, 99);
      assert.isOk(doc.created_at);
      assert.isOk(doc.updated_at);
    });
  });

  it('updates the search vector', function* () {
    yield db.docs.updateDoc(newDoc.id, {field: 'value', nested: {something: 'else'}});

    const record = yield db.docs.findOne(newDoc.id);

    assert.isOk(record.search);
  });

  it('sets null', function () {
    return db.docs.updateDoc(newDoc.id, {foo: null}).then(doc => {
      assert.isNull(doc.foo);
    });
  });

  it('does not set explicit undefined', function* () {
    const doc = yield db.docs.updateDoc(newDoc.id, {foo: undefined});

    assert.isDefined(doc.foo);
  });

  it('adds arrays', function () {
    return db.docs.updateDoc(newDoc.id, {array: [1, 2, 3]}).then(doc => {
      assert.deepEqual(doc.array, [1, 2, 3]);
    });
  });

  it('adds nested objects', function () {
    return db.docs.updateDoc(newDoc.id, {obj: {field: 'value'}}).then(doc => {
      assert.deepEqual(doc.obj, {field: 'value'});
    });
  });

  it('uses criteria objects', function () {
    return db.docs.updateDoc({name: 'foo'}, {appliedCriteria: true}).then(docs => {
      assert.lengthOf(docs, 1);
      assert.isTrue(docs[0].appliedCriteria);
    });
  });

  it('works with non-document json fields by id', function () {
    return db.products.updateDoc(2, {appliedCriteria: true}, {body: 'specs'}).then(product => {
      assert.isOk(product);
      assert.isTrue(product.specs.appliedCriteria);
    });
  });

  it('works with non-document json fields by *row* criteria', function () {
    return db.products.updateDoc({id: 3}, {appliedCriteria: true}, {body: 'specs'}).then(products => {
      assert.lengthOf(products, 1);
      assert.isTrue(products[0].specs.appliedCriteria);
    });
  });

  it('accepts options', function () {
    return db.products.updateDoc({id: 2}, {something: 'else'}, {build: true}).then(res => {
      assert.equal(res.sql, 'UPDATE "products" SET "body" = COALESCE("body", \'{}\'::jsonb) || $1 WHERE "body" @> $2 RETURNING *;');
      assert.deepEqual(res.params, [JSON.stringify({something: 'else'}), JSON.stringify({id: 2})]);
    });
  });
});
