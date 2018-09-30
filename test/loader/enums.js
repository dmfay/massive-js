'use strict';

describe('enums', function () {
  let db;

  before(function () {
    return resetDb('enums').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('loads enums', function () {
    assert.sameMembers(db.enums.myenum, ['one', 'two', 'three']);
  });

  it('requires reload to see new values', function* () {
    assert.sameMembers(db.enums.myenum, ['one', 'two', 'three']);

    yield db.query('ALTER TYPE myenum ADD VALUE \'four\';');

    assert.sameMembers(db.enums.myenum, ['one', 'two', 'three']);

    yield db.reload();

    assert.sameMembers(db.enums.myenum, ['one', 'two', 'three', 'four']);
  });
});
