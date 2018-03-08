'use strict';

describe('findDoc', function () {
  let db;

  before(function () {
    return resetDb('data-docs').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  describe('querying all documents', function () {
    it('returns all documents when passed an empty conditions block', function () {
      return db.docs.findDoc({}).then(docs => {
        assert.lengthOf(docs, 4);
      });
    });

    it('returns all documents if no parameter', function () {
      return db.docs.findDoc().then(docs => {
        assert.lengthOf(docs, 4);
        assert.equal(docs[0].id, 1);
        assert.equal(docs[0].title, 'Document 1');
        assert.equal(docs[0].description, 'lorem ipsum etc');
      });
    });
  });

  describe('querying documents by primary key', function () {
    it('finds a doc by an integer primary key', function () {
      return db.docs.findDoc(1).then(doc => {
        assert.equal(doc.id, 1);
      });
    });

    it('finds a doc by a uuid primary key', function () {
      return db.uuid_docs.findOne().then(row => {
        return db.uuid_docs.findDoc(row.id).then(doc => {
          assert.equal(doc.id, row.id);
        });
      });
    });

    it('finds a doc with > comparison on primary key', function () {
      return db.docs.findDoc({'id >': 1}).then(docs => {
        assert.lengthOf(docs, 3);
      });
    });

    it('finds a doc with >= comparison on primary key', function () {
      return db.docs.findDoc({'id >=': 2}).then(docs => {
        assert.lengthOf(docs, 3);
      });
    });

    it('finds multiple docs with an IN on primary key', function () {
      return db.docs.findDoc({'id': [1, 2, 3]}).then(docs => {
        assert.lengthOf(docs, 3);
      });
    });
  });

  describe('querying documents by fields', function () {
    it('finds a doc by title', function () {
      return db.docs.findDoc({title: 'Document 1'}).then(docs => {
        // find will return multiple if id not specified... confusing?
        assert.equal(docs[0].title, 'Document 1');
      });
    });

    it('parses greater than with two string defs', function () {
      return db.docs.findDoc({'price >': '18'}).then(docs => {
        assert.equal(docs[0].title, 'Document 1');
      });
    });

    it('parses greater than with a numeric', function () {
      return db.docs.findDoc({'price >': 18}).then(docs => {
        assert.equal(docs[0].title, 'Document 1');
      });
    });

    it('parses less than with a numeric', function () {
      return db.docs.findDoc({'price <': 18}).then(docs => {
        assert.equal(docs[0].title, 'Something Else');
      });
    });

    it('deals with arrays using IN', function () {
      return db.docs.findDoc({'title': ['Document 1', 'Document 2']}).then(docs => {
        assert.lengthOf(docs, 2);
      });
    });

    it('deals with arrays using NOT IN', function () {
      return db.docs.findDoc({'title <>': ['Document 1', 'Document 2']}).then(docs => {
        assert.lengthOf(docs, 2);
      });
    });

    it('check if field exists with IS NOT', function () {
      return db.docs.findDoc({'price is not': null}).then(docs => {
        assert.lengthOf(docs, 4);
      });
    });

    it('executes a contains if passed an array of objects', function () {
      return db.docs.findDoc({studios: [{name: 'Warner'}]}).then(docs => {
        assert.lengthOf(docs, 1);
      });
    });

    it('gets results from dual contains criteria', function () {
      return db.docs.findDoc({nested: {id: 1}, studios: [{name: 'Warner'}]}).then(docs => {
        assert.lengthOf(docs, 1);
      });
    });

    it('works properly with dates', function () {
      return db.docs.findDoc({'created_at <': new Date(1980, 1, 1)}).then(docs => {
        assert.lengthOf(docs, 1);
      });
    });

    it('works properly with timestamp including time zone', function () {
      return db.docs.findDoc({'created_at >': new Date('2015-03-04T09:00:00.000Z')}).then(docs => {
        assert.lengthOf(docs, 3);
      });
    });

    it('finds by nested fields', function () {
      return db.docs.findDoc({'nested.id': 1}).then(docs => {
        assert.lengthOf(docs, 1);
        assert.equal(docs[0].title, 'Something Else');
      });
    });

    it('finds by nested fields with operations', function () {
      return db.docs.findDoc({'nested.id >': 0}).then(docs => {
        assert.lengthOf(docs, 1);
        assert.equal(docs[0].title, 'Something Else');
      });
    });
  });

  describe('querying with options', function () {
    it('returns the first matching document', function () {
      return db.docs.findDoc({}, {single: true}).then(doc => {
        assert.equal(doc.id, 1);
      });
    });

    it('returns null when a single document is\'nt found', function () {
      return db.docs.findDoc({title: 'Not Found'}, {single: true}).then(doc => {
        assert.equal(doc, null);
      });
    });

    it('applies criteria', function () {
      return db.docs.findDoc({title: 'Document 1'}).then(docs => {
        assert.lengthOf(docs, 1);
        assert.equal(docs[0].id, 1);
        assert.equal(docs[0].title, 'Document 1');
        assert.equal(docs[0].description, 'lorem ipsum etc');
      });
    });

    it('restricts fields', function () {
      return db.docs.findDoc({title: 'Document 1'}, {fields: ['title']}).then(docs => {
        assert.lengthOf(docs, 1);
        assert.equal(docs[0].id, 1);
        assert.equal(docs[0].title, 'Document 1');
        assert.isUndefined(docs[0].description);
      });
    });

    it('passing object without hasOwnProperty method', function () {
      const criteria = Object.create(null);
      criteria.title = 'Document 1';

      return db.docs.findDoc(criteria).then(docs => {
        assert.lengthOf(docs, 1);
        assert.equal(docs[0].id, 1);
        assert.equal(docs[0].title, 'Document 1');
        assert.equal(docs[0].description, 'lorem ipsum etc');
      });
    });

    it('applies offset and limit with a fixed sort by pk', function () {
      return db.docs.findDoc({}, {offset: 1, limit: 1}).then(docs => {
        assert.lengthOf(docs, 1);
        assert.equal(docs[0].id, 2);
      });
    });

    it('orders by fields in the table', function () {
      return db.docs.findDoc({}, {order: [{field: 'id', direction: 'desc'}]}).then(docs => {
        assert.lengthOf(docs, 4);
        assert.equal(docs[0].id, 4);
        assert.equal(docs[1].id, 3);
        assert.equal(docs[2].id, 2);
        assert.equal(docs[3].id, 1);
      });
    });

    it('orders by literal exprs', function () {
      return db.docs.findDoc(
        {},
        {
          order: [{expr: 'body->>\'title\'', direction: 'desc'}]
        }
      ).then(docs => {
        assert.lengthOf(docs, 4);
        assert.equal(docs[0].title, 'Something Else');
        assert.equal(docs[1].title, 'Document 3');
        assert.equal(docs[2].title, 'Document 2');
        assert.equal(docs[3].title, 'Document 1');
      });
    });

    it('orders by fields in the document body', function () {
      return db.docs.findDoc({}, {
        order: [{field: 'title', direction: 'desc', type: 'varchar'}],
        orderBody: true
      }).then(docs => {
        assert.lengthOf(docs, 4);
        assert.equal(docs[0].title, 'Something Else');
        assert.equal(docs[1].title, 'Document 3');
        assert.equal(docs[2].title, 'Document 2');
        assert.equal(docs[3].title, 'Document 1');
      });
    });

    it('applies options', function () {
      return db.docs.findDoc({title: 'Document 1'}, {build: true}).then(query => {
        assert.deepEqual(query, {
          sql: 'SELECT * FROM "docs" WHERE "body" @> $1 ORDER BY "id"',
          params: ['{"title":"Document 1"}']
        });
      });
    });
  });
});
