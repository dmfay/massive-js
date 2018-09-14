'use strict';

describe('lastValue', function () {
  let db;

  before(function () {
    return resetDb('sequences').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('gets the last value for a sequence', function () {
    return db.one_counter.lastValue().then(res => assert.equal(res, 3));
  });
});
