'use strict';

describe('refresh', function () {
  let db;

  before(function () {
    return resetDb('views').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('refreshes a materialized view', function* () {
    const before = yield db.vals_ending_with_e.count({});

    assert.equal(before, 2);

    yield db.vals.insert({string: 'five'});

    const afterWithoutRefresh = yield db.vals_ending_with_e.count({});

    assert.equal(afterWithoutRefresh, 2);

    yield db.vals_ending_with_e.refresh();

    const afterWithRefresh = yield db.vals_ending_with_e.count({});

    assert.equal(afterWithRefresh, 3);
  });

  it('rejects if called for anything other than a materialized view', function () {
    return db.vals.refresh()
      .then(() => { assert.fail(); })
      .catch(err => {
        assert.equal(err.message, '"vals" is not a materialized view');
      });
  });
});
