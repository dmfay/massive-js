'use strict';
const Table = require("../lib/table");

describe('Document queries', function () {
  let db;

  before(function(){
    return resetDb().then(instance => db = instance);
  });

  describe('schemata', function () {
    it('loads document tables in public and in other schemata', function () {
      assert.instanceOf(db.docs, Table);
      assert.isFunction(db.docs.findDoc);
      assert.isFunction(db.docs.saveDoc);
      assert.isFunction(db.docs.searchDoc);
      assert.isFunction(db.docs.setAttribute);

      assert.instanceOf(db.myschema.docs, Table);
      assert.isFunction(db.myschema.docs.findDoc);
      assert.isFunction(db.myschema.docs.saveDoc);
      assert.isFunction(db.myschema.docs.searchDoc);
      assert.isFunction(db.myschema.docs.setAttribute);
    });
  });

  describe('findDoc', function () {
    it('returns results in document format', function () {
      return db.docs.findDoc("*").then(docs => {
        assert.lengthOf(docs, 3);
        assert.equal(docs[0].id, 1);
        assert.equal(docs[0].title, 'A Document');
        assert.equal(docs[0].description, 'lorem ipsum etc');
      });
    });
  });

  describe('searchDoc', function () {
    it('works on single key', function () {
      return db.docs.searchDoc({
        keys : ["title"],
        term : "Starsky"
      }).then(docs => {
        assert.lengthOf(docs, 1);
      });
    });

    it('works on multiple keys', function () {
      return db.docs.searchDoc({
        keys : ["title", "description"],
        term : "Starsky"
      }).then(docs => {
        assert.lengthOf(docs, 1);
      });
    });

    it('returns multiple results', function () {
      return db.docs.searchDoc({
        keys : ["title"],
        term : "Document"
      }).then(docs => {
        assert.lengthOf(docs, 2);
      });
    });

    it('returns properly formatted documents with id etc', function () {
      return db.docs.searchDoc({
        keys : ["title", "description"],
        term : "Starsky"
      }).then(docs => {
        assert.equal(docs[0].title, "Starsky and Hutch");
      });
    });

    it('returns right number of results if limit is specified', function () {
      return db.docs.searchDoc({
        keys : ["title"],
        term : "Document"
      }, {
        limit: 1
      }).then(docs => {
        assert.lengthOf(docs, 1);
      });
    });

    it('returns right elements if offset is specified', function* () {
      const docs = yield db.docs.searchDoc({
        keys : ["title"],
        term : "Document"
      }, {
        limit: 2
      });

      const docs2 = yield db.docs.searchDoc({
        keys : ["title"],
        term : "Document"
      }, {
        offset: 1,
        limit: 2
      });

      assert.equal(docs[1].id, docs2[0].id);
    });

    it('returns right elements if filter is specified', function () {
      return db.docs.searchDoc({
        keys : ["title"],
        term : "Document",
        where: {'price': 22.00}
      }).then(docs => {
        assert.lengthOf(docs, 1);
      });
    });

    it('orders by fields in the document body with criteria', function () {
      return db.docs.searchDoc({
        keys: ["title"],
        term: "Document"
      }, {
        order: [{field: 'title', direction: 'desc', type: 'varchar'}],
        orderBody: true
      }).then(docs => {
        assert.lengthOf(docs, 2);
        assert.equal(docs[0].title, 'Another Document');
        assert.equal(docs[1].title, 'A Document');
      });
    });
  });

  describe("setAttribute", function() {
    let newDoc = {};
    const array = [1,2,3];

    before(function() {
      return db.saveDoc("docs", {name:"Foo", score:1}).then(doc => newDoc = doc);
    });

    it('check saved attribute', function() {
      assert.equal(1, newDoc.score);
    });

    it('updates the document', function() {
      return db.docs.setAttribute(newDoc.id, "vaccinated", true).then(doc => {
        assert.equal(doc.vaccinated, true);
      });
    });

    it('updates the document when passed array value', function() {
      return db.docs.setAttribute(newDoc.id, "array", array).then(doc => {
        assert.deepEqual(doc.array, array);
      });
    });

    it('updates the document without replacing existing attributes', function() {
      return db.docs.setAttribute(newDoc.id, "score", 99).then(doc => {
        assert.equal(doc.score, 99);
        assert.equal(doc.vaccinated, true);
        assert.equal(doc.id, newDoc.id);
        assert.deepEqual(doc.array, array);
      });
    });

    it('escapes values properly', function() {
      return db.docs.setAttribute(newDoc.id, "field", "value").then(doc => {
        assert.equal(doc.score, 99);
        assert.equal(doc.vaccinated, true);
        assert.equal(doc.field, 'value');
        assert.equal(doc.id, newDoc.id);
        assert.deepEqual(doc.array, array);
      });
    });

    after(function () {
      return db.docs.destroy({id: newDoc.id});
    });
  });
});
