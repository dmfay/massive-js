'use strict';

describe('insert', function () {
  let db;

  before(function () {
    return resetDb('singletable').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('inserts a record and returns an object', function () {
    return db.products.insert({string: 'five'}).then(res => {
      assert.equal(res.string, 'five');
    });
  });

  it('inserts multiple products and returns an array', function () {
    return db.products.insert([{string: 'five'}, {string: 'six'}]).then(res => {
      assert.equal(res.length, 2);
      assert.equal(res[0].string, 'five');
      assert.equal(res[1].string, 'six');
    });
  });

  it('combines keys of partial objects on insert', function () {
    return db.products.insert([
      {string: 'eight', tags: ['this has a tag']},
      {string: 'nine', description: 'this has a description', specs: {weight: 10}}
    ]).then(res => {
      assert.equal(res.length, 2);
      assert.equal(res[0].id, 8);
      assert.equal(res[0].string, 'eight');
      assert.deepEqual(res[0].tags, ['this has a tag']);
      assert.equal(res[1].id, 9);
      assert.equal(res[1].string, 'nine');
      assert.deepEqual(res[1].specs, {weight: 10});
    });
  });

  it('rejects when a partial record excludes a constrained field', function () {
    return db.products.insert([
      {tags: ['this has a tag']},
      {description: 'this has a description', price: 1.23}
    ]).then(() => {
      assert.fail();
    }).catch(() => {});
  });

  it('inserts nothing', function () {
    return db.products.insert([]).then(res => {
      assert.equal(res.length, 0);
    });
  });

  it('inserts array fields', function () {
    return db.products.insert({string: 'ten', tags: ['one', 'two']}).then(res => {
      assert.equal(res.string, 'ten');
      assert.deepEqual(res.tags, ['one', 'two']);
    });
  });

  it('inserts empty array fields with a literal {}', function () {
    return db.products.insert({string: 'eleven', tags: '{}'}).then(res => {
      assert.equal(res.string, 'eleven');
      assert.deepEqual(res.tags, []);
    });
  });

  it('inserts empty array fields', function () {
    return db.products.insert({string: 'twelve', tags: []}).then(res => {
      assert.equal(res.string, 'twelve');
      assert.deepEqual(res.tags, []);
    });
  });

  it('inserts a record with a UUID key', function () {
    return db.products.insert({string: 'thirteen'}).then(res => {
      assert.isOk(res.uuid);
      assert.equal(res.string, 'thirteen');
    });
  });

  it('inserts a record into a table with a Cased Name', function () {
    return db.products.insert({CaseName: 'FourTeen', string: 'fourteen'}).then(res => {
      assert.equal(res.CaseName, 'FourTeen');
    });
  });

  it('returns an error when a constraint is violated', function () {
    return db.products.insert({string: null}).catch(err => {
      assert.equal(err.code, '23502');
      assert.isOk(err.detail);
    });
  });

  it('applies options', function () {
    return db.products.insert({string: 'fifteen'}, {build: true}).then(res => {
      assert.deepEqual(res, {
        sql: 'INSERT INTO "products" ("string") VALUES ($1) RETURNING *',
        params: ['fifteen']
      });
    });
  });

  it('rejects if not insertable', function* () {
    let caught = false;

    try {
      db.products.insertable = false;

      yield db.products.insert({string: 'sixteen'});
    } catch (err) {
      caught = true;

      assert.equal(err.message, 'products is not writable');
    } finally {
      db.products.insertable = true;

      if (!caught) {
        assert.fail();
      }
    }
  });

  it('rejects if no data', function () {
    return db.products.insert()
      .then(() => { assert.fail(); })
      .catch(err => {
        assert.equal(err.message, 'Must provide data to insert');
      });
  });
});
