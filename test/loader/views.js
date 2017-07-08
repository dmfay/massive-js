'use strict';

const loader = require('../../lib/loader/views');

describe('views', function () {
  let db;

  before(function* () {
    db = yield resetDb();
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('should query for a list of views', function* () {
    const config = _.defaults({allowedSchemas: '', blacklist: '', exceptions: ''}, db.loader);
    const views = yield loader(db, config);

    assert.isArray(views);
    assert.lengthOf(views, 3);
    assert.isTrue(views[0].hasOwnProperty('schema'));
    assert.isTrue(views[0].hasOwnProperty('name'));
  });
});
