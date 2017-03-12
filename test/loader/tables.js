'use strict';

const loader = require('../../lib/loader/tables');

describe('tables', function () {
  let db;

  before(function* () {
    db = yield resetDb();
  });

  it('should query for a list of tables', function* () {
    const tables = yield loader(db, {allowedSchemas: '', blacklist: '', exceptions: ''});

    assert.isArray(tables);
    assert.lengthOf(tables, 10);
    assert.isTrue(tables[0].hasOwnProperty('schema'));
    assert.isTrue(tables[0].hasOwnProperty('name'));
    assert.isTrue(tables[0].hasOwnProperty('parent'));
    assert.isTrue(tables[0].hasOwnProperty('pk'));
  });
});
