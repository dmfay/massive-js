'use strict';

const loader = require('../../lib/loader/tables');

describe('tables', function () {
  let db;

  before(function* () {
    db = yield resetDb('updatables');
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('should query for a list of tables', function* () {
    db.loader = _.defaults({allowedSchemas: '', blacklist: '', exceptions: ''}, db.loader);
    const tables = yield loader(db);

    assert.isArray(tables);
    assert.lengthOf(tables, 5);
    assert.isTrue(tables[0].hasOwnProperty('schema'));
    assert.isTrue(tables[0].hasOwnProperty('name'));
    assert.isTrue(tables[0].hasOwnProperty('parent'));
    assert.isTrue(tables[0].hasOwnProperty('pk'));
  });

  it('should ignore null keys in the pk property', function* () {
    db.loader = _.defaults({whitelist: 'no_pk'}, db.loader);
    const tables = yield loader(db);

    assert.lengthOf(tables, 1);

    assert.equal(tables[0].name, 'no_pk');
    assert.isNull(tables[0].pk);
  });
});
