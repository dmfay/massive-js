'use strict';

const loader = require('../../lib/loader/views');

describe('views', function () {
  let db;

  before(function* () {
    db = yield resetDb();
  });

  it('should query for a list of views', function* () {
    const views = yield loader(db, {allowedSchemas: '', blacklist: '', exceptions: ''});

    assert.isArray(views);
    assert.lengthOf(views, 3);
    assert.isTrue(views[0].hasOwnProperty('schema'));
    assert.isTrue(views[0].hasOwnProperty('name'));
  });
});
