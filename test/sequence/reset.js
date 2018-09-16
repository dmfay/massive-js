'use strict';

describe('reset', function () {
  let db;

  before(function () {
    return resetDb('sequences').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('resets a sequence', function* () {
    const nextVal = yield db.one_counter.nextValue();

    assert.isAbove(Number(nextVal), 1);

    yield db.one_counter.reset();

    const postReset = yield db.one_counter.lastValue();

    assert.equal(postReset, 1);
  });

  it('resets a sequence to a specific value', function* () {
    yield db.one_counter.reset(123);

    const postReset = yield db.one_counter.lastValue();

    assert.equal(postReset, 123);
  });
});
