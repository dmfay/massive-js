'use strict';

const loader = require('../../lib/loader/tables');

describe('tables', function () {
  let db;

  before(function* () {
    db = yield resetDb();
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('should query for a list of tables', function* () {
    const config = _.defaults({allowedSchemas: '', blacklist: '', exceptions: ''}, db.loader);
    const tables = yield loader(db, config);

    assert.isArray(tables);
    assert.lengthOf(tables, 10);
    assert.isTrue(tables[0].hasOwnProperty('schema'));
    assert.isTrue(tables[0].hasOwnProperty('name'));
    assert.isTrue(tables[0].hasOwnProperty('parent'));
    assert.isTrue(tables[0].hasOwnProperty('pk'));
  });
});
