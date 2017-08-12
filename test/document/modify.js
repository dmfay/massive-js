'use strict';

describe('modify', function () {
  let db;
  let newDoc = {};

  before(function() {
    return resetDb()
      .then(instance => db = instance)
      .then(() => {
        return db.saveDoc('docs', {name: 'foo'});
      }).then(doc => newDoc = doc);
  });

  after(function () {
    return db.docs.destroy({id: newDoc.id}).then(() => {
      return db.instance.$pool.end();
    });
  });

  it('adds new information to the document', function() {
    return db.docs.modify(newDoc.id, {score: 99}).then(doc => {
      assert.equal(doc.name, 'foo');
      assert.equal(doc.score, 99);
    });
  });

  it('updates the document', function() {
    return db.docs.modify(newDoc.id, {score: 100}).then(doc => {
      assert.equal(doc.name, 'foo');
      assert.equal(doc.score, 100);
    });
  });

  it('sets null', function() {
    return db.docs.modify(newDoc.id, {foo: null}).then(doc => {
      assert.isNull(doc.foo);
    });
  });

  it('does not set undefined', function() {
    return db.docs.modify(newDoc.id, {foo: undefined}).then(doc => {
      assert.isDefined(doc.foo);
    });
  });

  it('adds arrays', function() {
    return db.docs.modify(newDoc.id, {array: [1, 2, 3]}).then(doc => {
      assert.deepEqual(doc.array, [1, 2, 3]);
    });
  });

  it('adds nested objects', function() {
    return db.docs.modify(newDoc.id, {obj: {field: 'value'}}).then(doc => {
      assert.deepEqual(doc.obj, {field: 'value'});
    });
  });

  it('uses criteria objects', function() {
    return db.docs.modify({name: 'foo'}, {appliedCriteria: true}).then(docs => {
      assert.lengthOf(docs, 1);
      assert.isTrue(docs[0].appliedCriteria);
    });
  });

  it('works with non-document json fields by id', function() {
    return db.products.modify(2, {appliedCriteria: true}, 'specs').then(product => {
      assert.isOk(product);
      assert.isTrue(product.specs.appliedCriteria);
    });
  });

  it('works with non-document json fields by *row* criteria', function() {
    return db.products.modify({name: 'Product 3'}, {appliedCriteria: true}, 'specs').then(products => {
      assert.lengthOf(products, 1);
      assert.isTrue(products[0].specs.appliedCriteria);
    });
  });
});
