'use strict';

const loader = require('../../lib/loader/functions');

describe('functions', function () {
  let db;

  before(function* () {
    db = yield resetDb('functions');
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('should query for a list of functions', function* () {
    const functions = yield loader(db, db.loader);

    assert.isArray(functions);
    assert.isTrue(functions.length > 0);
    assert.isTrue(functions[0].hasOwnProperty('name'));
    assert.isTrue(functions[0].hasOwnProperty('schema'));
    assert.isTrue(functions[0].hasOwnProperty('sql'));
  });
});
