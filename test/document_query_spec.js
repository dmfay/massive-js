const assert = require("chai").assert;
const Table = require("../lib/table");

require('co-mocha');

describe('Document queries', function () {
  var db;

  before(function(){
    return resetDb().then(instance => db = instance);
  });

  describe('schemata', function () {
    it('loads document tables in public and in other schemata', function () {
      assert.instanceOf(db.docs, Table);
      assert.isFunction(db.docs.findDoc);
      assert.isFunction(db.docs.saveDoc);
      assert.isFunction(db.docs.searchDoc);

      assert.instanceOf(db.myschema.docs, Table);
      assert.isFunction(db.myschema.docs.findDoc);
      assert.isFunction(db.myschema.docs.saveDoc);
      assert.isFunction(db.myschema.docs.searchDoc);
    });
  });

  describe('findDoc', function () {
    describe('finding all documents', function () {
      it('returns all documents when passed "*"', function () {
        return db.docs.findDoc("*").then(docs => {
          assert.lengthOf(docs, 3);
        });
      });

      it('returns all documents when passed an empty conditions block', function () {
        return db.docs.findDoc({}).then(docs => {
          assert.lengthOf(docs, 3);
        });
      });

      it('returns all documents when passed nothing', function () {
        return db.docs.findDoc().then(docs => {
          assert.lengthOf(docs, 3);
        });
      });
    });

    describe('primary key queries', function () {
      it('finds a doc by an integer primary key', function () {
        return db.docs.findDoc(1).then(doc => {
          assert.equal(doc.id, 1);
        });
      });

      it('finds a doc by a uuid primary key', function* () {
        const row = yield db.uuid_docs.findOne();
        const doc = yield db.uuid_docs.findDoc(row.id);

        assert.equal(doc.id, row.id);
      });

      it('finds docs with > comparison on primary key', function () {
        return db.docs.findDoc({"id >" : 1}).then(docs => {
          assert.lengthOf(docs, 2);
        });
      });

      it('finds docs with >= comparison on primary key', function () {
        return db.docs.findDoc({"id >=" : 2}).then(docs => {
          assert.lengthOf(docs, 2);
        });
      });
    });

    describe('criteria queries', function () {
      it('finds a doc by title', function () {
        return db.docs.findDoc({title: "A Document"}).then(docs => {
          //find will return multiple if id not specified... confusing?
          assert.equal(docs[0].title, "A Document");
        });
      });

      it('parses greater than with two string defs', function () {
        return db.docs.findDoc({"price >" : "18"}).then(docs => {
          assert.equal(docs[0].title, "A Document");
        });
      });

      it('parses greater than with a numeric', function () {
        return db.docs.findDoc({"price >" : 18}).then(docs => {
          assert.equal(docs[0].title, "A Document");
        });
      });

      it('parses less than with a numeric', function () {
        return db.docs.findDoc({"price <" : 18}).then(docs => {
          assert.equal(docs[0].title, "Starsky and Hutch");
        });
      });

      it('deals with arrays using IN', function () {
        return db.docs.findDoc({"price" : [18, 6]}).then(docs => {
          assert.lengthOf(docs, 2);
        });
      });

      it('deals with arrays using NOT IN', function () {
        return db.docs.findDoc({"price <>" : [18, 6]}).then(docs => {
          assert.lengthOf(docs, 1);
        });
      });

      it('executes a contains if passed an array of objects', function () {
        return db.docs.findDoc({studios : [{name : "Warner"}]}).then(docs => {
          assert.lengthOf(docs, 1);
        });
      });

      it('works properly with dates', function () {
        return db.docs.findDoc({"created_at <" : new Date(1980, 1,1)}).then(docs => {
          assert.lengthOf(docs, 1);
        });
      });
    });

    describe('options', function () {
      it('returns the first matching document', function () {
        return db.docs.findDoc("*", {single: true}).then(docs => {
          assert.equal(docs.id, 1);
        });
      });

      it('applies offset and limit with a fixed sort by pk', function () {
        return db.docs.findDoc("*", {offset: 1, limit: 1}).then(docs => {
          assert.lengthOf(docs, 1);
          assert.equal(docs[0].id, 2);
        });
      });

      it('orders by fields in the table', function () {
        return db.docs.findDoc('*', {order: 'id desc'}).then(docs => {
          assert.lengthOf(docs, 3);
          assert.equal(docs[0].id, 3);
          assert.equal(docs[1].id, 2);
          assert.equal(docs[2].id, 1);
        });
      });

      it('orders by fields in the document body', function () {
        // nb: no parsing the key here -- it has to be exactly as you'd paste it into psql
        return db.docs.findDoc('*', {order: "body->>'title' desc"}).then(docs => {
          assert.lengthOf(docs, 3);
          assert.equal(docs[0].title, 'Starsky and Hutch');
          assert.equal(docs[1].title, 'Another Document');
          assert.equal(docs[2].title, 'A Document');
        });
      });

      it('orders by fields in the document body with criteria', function () {
        return db.docs.findDoc('*', {
          order: [{field: 'title', direction: 'desc', type: 'varchar'}],
          orderBody: true
        }).then(docs => {
          assert.lengthOf(docs, 3);
          assert.equal(docs[0].title, 'Starsky and Hutch');
          assert.equal(docs[1].title, 'Another Document');
          assert.equal(docs[2].title, 'A Document');
        });
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
});
