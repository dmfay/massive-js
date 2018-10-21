'use strict';

const {resetDb} =  require('./../helpers/');

describe('find', function () {
  let db;

  before(function () {
    return resetDb('data-all').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  describe('all records', function () {
    it('returns all records on find with no args', function () {
      return db.products.find().then(res => assert.lengthOf(res, 4));
    });

    it('returns all records on find with empty conditions', function () {
      return db.products.find({}).then(res => assert.lengthOf(res, 4));
    });
  });

  describe('primary keys', function () {
    it('finds by a numeric key and returns a result object', function () {
      return db.products.find(1).then(res => {
        assert.isObject(res);
        assert.equal(res.id, 1);
      });
    });

    it('finds by a string/uuid key and returns a result object', function* () {
      const order = yield db.orders.findOne();
      assert.isOk(order);

      const res = yield db.orders.find(order.id);
      assert.equal(res.id, order.id);
    });

    it('finds a doc by an integer primary key', function () {
      return db.docs.find(1, {document: true}).then(doc => {
        assert.equal(doc.id, 1);
      });
    });

    it('finds a doc by a uuid primary key', function* () {
      const row = yield db.uuid_docs.findOne();
      const doc = yield db.uuid_docs.find(row.id, {document: true});

      assert.equal(doc.id, row.id);
    });

    it('finds docs with > comparison on primary key', function () {
      return db.docs.find({'id >': 1}, {document: true}).then(docs => {
        assert.lengthOf(docs, 3);
      });
    });

    it('finds docs with >= comparison on primary key', function () {
      return db.docs.find({'id >=': 2}, {document: true}).then(docs => {
        assert.lengthOf(docs, 3);
      });
    });
  });

  describe('comparative queries', function () {
    it('returns product with id greater than 2', function () {
      return db.products.find({'id > ': 2}).then(res => assert.equal(res[0].id, 3));
    });

    it('returns product with id less than 2', function () {
      return db.products.find({'id < ': 2}).then(res => assert.equal(res[0].id, 1));
    });

    it('returns products IN 1 and 2', function () {
      return db.products.find({id: [1, 2]}).then(res => assert.equal(res[0].id, 1));
    });

    it('returns product NOT IN 1 and 2', function () {
      return db.products.find({'id <>': [1, 2]}).then(res => assert.equal(res[0].id, 3));
    });

    it('returns products by finding a null field', function () {
      return db.products.find({'tags': null}).then(res => {
        assert.lengthOf(res, 1);
        assert.equal(res[0].id, 1);
      });
    });

    it('returns products by finding a non-null field', function () {
      return db.products.find({'id != ': null}).then(res => {
        assert.lengthOf(res, 4);
        assert.equal(res[0].id, 1);
      });
    });

    it('returns products using is null', function () {
      return db.products.find({'tags is': null}).then(res => {
        assert.lengthOf(res, 1);
        assert.equal(res[0].id, 1);
      });
    });

    it('returns products using is not null', function () {
      return db.products.find({'id is not': null}).then(res => {
        assert.lengthOf(res, 4);
        assert.equal(res[0].id, 1);
      });
    });

    it('returns products using distinct from', function () {
      return db.products.find({'tags is distinct from': '{tag1,tag2}'}).then(res => assert.lengthOf(res, 3));
    });

    it('returns products using not distinct from', function () {
      return db.products.find({'tags is not distinct from': '{tag1,tag2}'}).then(res => assert.lengthOf(res, 1));
    });

    it('returns products with a compound query including a null field', function () {
      return db.products.find({'id': 1, 'tags': null, price: 12.00}).then(res => {
        assert.lengthOf(res, 1);
        assert.equal(res[0].id, 1);
      });
    });
  });

  describe('pattern-matching queries', function () {
    it('finds a product by a search string with LIKE', function () {
      return db.products.findOne({'name like': '%odu_t 2'}).then(product => {
        assert.equal(product.id, 2);
        assert.equal(product.name, 'Product 2');
      });
    });

    it('finds a product by a search string with NOT LIKE', function () {
      return db.products.findOne({'name not like': '%odu_t 2'}).then(product => {
        assert.notEqual(product.id, 2);
        assert.notEqual(product.name, 'Product 2');
      });
    });

    it('uses alternative forms', function () {
      return db.products.findOne({'name ~~': '%odu_t 2'}).then(product => {
        assert.equal(product.id, 2);
        assert.equal(product.name, 'Product 2');
      });
    });

    it('finds a product by a search string with ILIKE', function () {
      return db.products.findOne({'name ilike': '%OdU_t 2'}).then(product => {
        assert.equal(product.id, 2);
        assert.equal(product.name, 'Product 2');
      });
    });

    it('finds a product by a search string with NOT ILIKE', function () {
      return db.products.findOne({'name not ilike': '%OdU_t 2'}).then(product => {
        assert.notEqual(product.id, 2);
        assert.notEqual(product.name, 'Product 2');
      });
    });

    it('finds products matching a regexoid with SIMILAR TO', function () {
      return db.products.find({'name similar to': '(P[rod]+uct 2|%duct 3)'}).then(products => {
        assert.equal(products.length, 2);
        assert.equal(products[0].id, 2);
        assert.equal(products[0].name, 'Product 2');
        assert.equal(products[1].id, 3);
        assert.equal(products[1].name, 'Product 3');
      });
    });

    it('finds products not matching a regexoid with NOT SIMILAR TO', function () {
      return db.products.find({'name not similar to': '(P[rod]+uct 2|%duct 3)'}).then(products => {
        assert.equal(products.length, 2);
        assert.equal(products[0].id, 1);
        assert.equal(products[0].name, 'Product 1');
        assert.equal(products[1].id, 4);
        assert.equal(products[1].name, 'Product 4');
      });
    });

    it('finds products matching a case-sensitive POSIX regex', function () {
      return db.products.findOne({'name ~': 'Product[ ]*1(?!otherstuff)'}).then(product => {
        assert.equal(product.id, 1);
        assert.equal(product.name, 'Product 1');
      });
    });

    it('finds products not matching a case-sensitive POSIX regex', function () {
      return db.products.findOne({'name !~': 'Product[ ]*[2-4](?!otherstuff)'}).then(product => {
        assert.equal(product.id, 1);
        assert.equal(product.name, 'Product 1');
      });
    });

    it('finds products matching a case-insensitive POSIX regex', function () {
      return db.products.findOne({'name ~*': 'product[ ]*1(?!otherstuff)'}).then(product => {
        assert.equal(product.id, 1);
        assert.equal(product.name, 'Product 1');
      });
    });

    it('finds products not matching a case-insensitive POSIX regex', function () {
      return db.products.findOne({'name !~*': 'product[ ]*[2-4](?!otherstuff)'}).then(product => {
        assert.equal(product.id, 1);
        assert.equal(product.name, 'Product 1');
      });
    });
  });

  describe('JSON queries', function () {
    it('finds a product matching the desired spec field in JSON', function () {
      return db.products.findOne({'specs.weight': 30}).then(product => {
        assert.equal(product.id, 3);
        assert.equal(product.specs.weight, 30);
      });
    });
    it('finds a product matching the desired spec index in JSON', function () {
      return db.products.findOne({'specs[4]': 'array'}).then(product => {
        assert.equal(product.id, 4);
        assert.equal(product.specs[4], 'array');
      });
    });
    it('finds a product matching the desired spec path in JSON', function () {
      return db.products.findOne({'specs.dimensions.length': 15}).then(product => {
        assert.equal(product.id, 2);
        assert.equal(product.specs.dimensions.length, 15);
      });
    });
    it('finds a product with a spec matching an IN list', function () {
      return db.products.findOne({'specs.weight': [30, 35]}).then(product => {
        assert.equal(product.id, 3);
        assert.equal(product.specs.weight, 30);
      });
    });
    it('mixes JSON and non-JSON predicates', function () {
      return db.products.findOne({price: 35.00, 'specs.weight': 30}).then(product => {
        assert.equal(product.id, 3);
        assert.equal(product.specs.weight, 30);
      });
    });
  });

  describe('array operations', function () {
    it('filters by array fields containing a value', function () {
      return db.products.find({'tags @>': ['tag2']}).then(res => {
        assert.lengthOf(res, 2);
        assert.equal(res[0].id, 2);
        assert.equal(res[1].id, 3);
      });
    });

    it('filters by array fields contained in a value', function () {
      return db.products.find({'tags <@': ['tag2', 'tag3', 'tag4']}).then(res => {
        assert.lengthOf(res, 1);
        assert.equal(res[0].id, 3);
      });
    });

    it('filters by array fields overlapping a value', function () {
      return db.products.find({'tags &&': ['tag3', 'tag4', 'tag5']}).then(res => {
        assert.lengthOf(res, 2);
        assert.equal(res[0].id, 3);
        assert.equal(res[1].id, 4);
      });
    });

    it('allows falling back to a postgres-formatted array literal', function () {
      return db.products.find({'tags @>': '{tag2}'}, {build: false}).then(res => {
        assert.lengthOf(res, 2);
        assert.equal(res[0].id, 2);
        assert.equal(res[1].id, 3);
      });
    });

    it('handles apostrophes in array values', function () {
      return db.products.find({'tags @>': ['tag\'quote']}).then(res => {
        assert.lengthOf(res, 1);
        assert.equal(res[0].id, 4);
      });
    });

    it('handles commas in array values', function () {
      return db.products.find({'tags @>': ['tag,comma']}).then(res => {
        assert.lengthOf(res, 1);
        assert.equal(res[0].id, 4);
      });
    });

    it('handles braces in array values', function () {
      return db.products.find({'tags @>': ['tag{brace}']}).then(res => {
        assert.lengthOf(res, 1);
        assert.equal(res[0].id, 4);
      });
    });
  });

  describe('document generator', function () {
    it('finds a doc by title', function () {
      return db.docs.find({title: 'Document 1'}, {document: true, generator: 'docGenerator'}).then(docs => {
        assert.equal(docs[0].title, 'Document 1');
      });
    });

    it('orders by fields in the table', function () {
      return db.docs.find(
        {},
        {
          order: [{field: 'id', direction: 'desc'}],
          document: true,
          generator: 'docGenerator'
        }
      ).then(docs => {
        assert.lengthOf(docs, 4);
        assert.equal(docs[0].id, 4);
        assert.equal(docs[1].id, 3);
        assert.equal(docs[2].id, 2);
        assert.equal(docs[3].id, 1);
      });
    });

    it('orders by literal exprs', function () {
      return db.docs.find(
        {},
        {
          order: [{expr: 'body->>\'title\'', direction: 'desc'}],
          document: true,
          generator: 'docGenerator'
        }
      ).then(docs => {
        assert.lengthOf(docs, 4);
        assert.equal(docs[0].title, 'Something Else');
        assert.equal(docs[1].title, 'Document 3');
        assert.equal(docs[2].title, 'Document 2');
        assert.equal(docs[3].title, 'Document 1');
      });
    });

    it('orders by fields in the document body with a field spec', function () {
      return db.docs.find({}, {
        order: [{field: 'title', direction: 'desc', type: 'varchar'}],
        orderBody: true,
        document: true,
        generator: 'docGenerator'
      }).then(docs => {
        assert.lengthOf(docs, 4);
        assert.equal(docs[0].title, 'Something Else');
        assert.equal(docs[1].title, 'Document 3');
        assert.equal(docs[2].title, 'Document 2');
        assert.equal(docs[3].title, 'Document 1');
      });
    });
  });

  describe('querying with options', function () {
    it('returns 1 result with limit of 1', function () {
      return db.products.find({}, {limit: 1}).then(res => assert.lengthOf(res, 1));
    });

    it('returns second result with limit of 1, offset of 1', function () {
      return db.products.find({}, {limit: 1, offset: 1}).then(res => assert.equal(res[0].id, 2));
    });

    it('restricts the select list to specified fields', function () {
      return db.products.find({}, {fields: ['id', 'name']}).then(res => {
        const keys = _.keys(res[0]);
        assert.equal(keys.length, 2);
      });
    });

    it('applies fields and exprs', function () {
      return db.products.find({}, {fields: ['id'], exprs: {name: 'upper(name)'}}).then(res => {
        assert.equal(res[0].id, 1);
        assert.equal(res[0].name, 'PRODUCT 1');
      });
    });

    it('returns ascending order of products by price', function () {
      return db.products.find({}, {order: [{field: 'price'}]}).then(res => {
        assert.lengthOf(res, 4);
        assert.equal(res[0].id, 1);
        assert.equal(res[2].id, 3);
      });
    });

    it('returns descending order of products', function () {
      return db.products.find({}, {order: [{field: 'id', direction: 'desc'}]}).then(res => {
        assert.lengthOf(res, 4);
        assert.equal(res[0].id, 4);
        assert.equal(res[2].id, 2);
      });
    });

    it('returns a single result', function () {
      return db.products.find({}, {order: [{field: 'id', direction: 'desc'}], single: true}).then(res => assert.equal(res.id, 4));
    });

    it('supports options in findOne', function () {
      return db.products.findOne({}, {order: [{field: 'id', direction: 'desc'}], fields: 'id'}).then(res => {
        assert.equal(res.id, 4);
        assert.equal(Object.keys(res).length, 1);
      });
    });

    it('uses keyset pagination', function () {
      return db.products.find({}, {order: [{field: 'id', direction: 'asc', last: 2}], pageLength: 2}).then(res => {
        assert.lengthOf(res, 2);
        assert.equal(res[0].id, 3);
        assert.equal(res[1].id, 4);
      });
    });

    it('uses keyset pagination with descending order', function () {
      return db.products.find({}, {order: [{field: 'id', direction: 'desc', last: 3}], pageLength: 2}).then(res => {
        assert.lengthOf(res, 2);
        assert.equal(res[0].id, 2);
        assert.equal(res[1].id, 1);
      });
    });

    it('uses keyset pagination with exprs', function () {
      return db.products.find({}, {order: [{expr: '0 - id', direction: 'desc', last: 3}], pageLength: 2}).then(res => {
        assert.lengthOf(res, 2);
        assert.equal(res[0].id, 1);
        assert.equal(res[1].id, 2);
      });
    });

    it('combines keyset pagination with existing criteria', function () {
      return db.products.find({'price >': 20}, {order: [{field: 'id', last: 2}], pageLength: 2}).then(res => {
        assert.lengthOf(res, 2);
        assert.equal(res[0].id, 3);
        assert.equal(res[1].id, 4);
      });
    });

    it('changes null positioning', function () {
      return db.products.find({}, {order: [{field: 'specs', nulls: 'first'}]}).then(res => {
        assert.lengthOf(res, 4);
        assert.isNull(res[0].specs);
      });
    });
  });

  describe('casing issues', function () {
    it('returns users because we delimit OK', function () {
      return db.Users.find({}).then(res => assert.lengthOf(res, 1));
    });

    it('returns the first user because we delimit OK', function () {
      return db.Users.findOne().then(res => assert.equal(res.Id, 1));
    });

    it('rejects when field array is empty', function () {
      db.Users.find({}, {fields: []})
        .then(() => assert.fail('Should not show up'))
        .catch(err => { assert.equal(err.message, 'The fields array cannot be empty'); });
    });

    it('returns a subset of fields, when we delimit in the calling code', function () {
      return db.Users.find({}, {fields: ['"Id"', '"Email"']}).then(res => assert.lengthOf(res, 1));
    });

    it('returns a single column, when we delimit in the calling code', function () {
      return db.Users.find({}, {fields: '"Email"'}).then(res => assert.lengthOf(res, 1));
    });

    it('returns users with a simple order by', function () {
      return db.Users.find({}, {order: [{field: '"Email"'}]}).then(res => assert.lengthOf(res, 1));
    });

    it('returns users with a compound order by', function () {
      return db.Users.find(
        {},
        {
          order: [
            {field: '"Email"'},
            {field: '"Id"', direction: 'desc'}
          ]
        }
      ).then(res => assert.lengthOf(res, 1));
    });

    it('returns users with a complex order by', function* () {
      const res = yield db.Users.find({}, {
        order: [
          {field: '"Email"', direction: 'asc'},
          {field: '"Id"', direction: 'desc'}
        ]
      });

      assert.lengthOf(res, 1);
    });

    it('counts all funny cased users', function () {
      return db.Users.count({}).then(res => assert.equal(res, 1));
    });

    it('counts funny cased users when we use a where and delimit the condition', function () {
      return db.Users.count('"Email"=$1', ['test@test.com']).then(res => assert.equal(res, 1));
    });

    it('returns users when we use a simple where', function () {
      return db.Users.where('"Email"=$1', ['test@test.com']).then(res => assert.lengthOf(res, 1));
    });
  });

  describe('view queries', function () {
    it('returns all records on find with no args', function () {
      return db.popular_products.find().then(res => assert.lengthOf(res, 3));
    });
    it('returns first record with findOne no args', function () {
      return db.popular_products.findOne().then(res => assert.equal(res.id, 1));
    });
    it('handles multiple predicates', function () {
      return db.popular_products.where('price=$1 OR price=$2', [12.00, 24.00]).then(res => assert.lengthOf(res, 2));
    });
    it('counts rows with where-style args', function () {
      return db.popular_products.count('price=$1 OR price=$2', [12.00, 24.00]).then(res => assert.equal(res, 2));
    });
    it('counts rows with find-style args', function () {
      return db.popular_products.count({price: [12.00, 24.00]}).then(res => assert.equal(res, 2));
    });
    it('makes comparisons', function () {
      return db.popular_products.find({'price > ': 30.00}).then(res => {
        assert.lengthOf(res, 1);
        assert.equal(res[0].id, 4);
      });
    });
    it('rejects if you try to search by pk', function () {
      return db.popular_products.find(1).then(() => { assert.fail(); }).catch(() => {});
    });
  });

  describe('view queries with options', function () {
    it('applies offsets and limits', function () {
      return db.popular_products.find({}, {limit: 1, offset: 1}).then(res => {
        assert.lengthOf(res, 1);
        assert.equal(res[0].id, 2);
      });
    });

    it('restricts fields', function () {
      return db.popular_products.find({}, {fields: ['id', 'price']}).then(res => {
        const keys = _.keys(res[0]);
        assert.equal(keys.length, 2);
      });
    });

    it('allows expressions in the select list', function () {
      return db.popular_products.find({}, {fields: ['id'], exprs: {name: 'upper(name)'}}).then(res => {
        assert.equal(res[0].id, 1);
        assert.equal(res[0].name, 'PRODUCT 1');
      });
    });

    it('applies sorting', function () {
      return db.popular_products.find({}, {order: [{field: 'id', direction: 'desc'}]}).then(res => {
        assert.lengthOf(res, 3);
        assert.equal(res[0].id, 4);
        assert.equal(res[1].id, 2);
        assert.equal(res[2].id, 1);
      });
    });

    it('returns a single result', function () {
      return db.popular_products.find({}, {order: [{field: 'id', direction: 'desc'}], single: true}).then(res => assert.equal(res.id, 4));
    });

    it('works with materialized views', function () {
      return db.mv_orders.find().then(res => assert.lengthOf(res, 3));
    });
  });

  describe('streaming results', function () {
    it('returns a readable stream', function (done) {
      db.products.find({}, {stream: true}).then(stream => {
        const result = [];

        stream.on('readable', function () {
          let res;

          while (res = stream.read()) { // eslint-disable-line no-cond-assign
            if (res) {
              result.push(res);
            }
          }
        });

        stream.on('end', function () {
          assert.equal(4, result.length);
          done();
        });
      });
    });
  });
});
