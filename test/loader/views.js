'use strict';

const loader = require('../../lib/loader/views');

describe('views', function () {
  let db;

  before(function* () {
    db = yield resetDb('views');
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('should query for a list of views', function* () {
    const config = _.defaults({
      allowedSchemas: '',
      blacklist: '',
      exceptions: ''
    }, db.loader);

    const views = yield loader(db, config);

    assert.isArray(views);
    assert.lengthOf(views, 2);
    assert.isTrue(views[0].hasOwnProperty('schema'));
    assert.isTrue(views[0].hasOwnProperty('name'));
    assert.deepEqual(views.map(v => v.name).sort(), [
      'vals_ending_with_e',
      'vals_starting_with_t'
    ]);
  });

  it('should exclude materialized views', function* () {
    const config = _.defaults({
      allowedSchemas: '',
      blacklist: '',
      exceptions: '',
      excludeMatViews: true
    }, db.loader);

    const views = yield loader(db, config);

    assert.isArray(views);
    assert.lengthOf(views, 1);
    assert.isTrue(views[0].hasOwnProperty('schema'));
    assert.isTrue(views[0].hasOwnProperty('name'));
    assert.equal(views[0].name, 'vals_starting_with_t');
  });
});
