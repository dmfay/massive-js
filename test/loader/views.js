'use strict';

const loader = require('../../lib/loader/views');

describe('views', function () {
  let db;

  before(function* () {
    db = yield resetDb('singleview');
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('should query for a list of views', function* () {
    const config = _.defaults({allowedSchemas: '', blacklist: '', exceptions: ''}, db.loader);
    const views = yield loader(db, config);

    assert.isArray(views);
    assert.lengthOf(views, 1);
    assert.isTrue(views[0].hasOwnProperty('schema'));
    assert.isTrue(views[0].hasOwnProperty('name'));
    assert.equal(views[0].name,'products_named_t');
  });
});
