'use strict';

describe('initialization', function () {
  let db;

  before(function() {
    return resetDb('functions').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('wires an invocation function', function () {
    assert.isFunction(db.get_number);
  });

  it('handles casing and schema', function* () {
    let res;

    assert.isOk(db.get_number);
    res = yield db.get_number();
    assert.equal(res, 1);

    assert.isOk(db.GetNumber);
    res = yield db.GetNumber();
    assert.equal(res, 2);

    assert.isOk(db.one.get_number);
    res = yield db.one.get_number();
    assert.equal(res, 3);

    assert.isOk(db.one.GetNumber);
    res = yield db.one.GetNumber();
    assert.equal(res, 4);
  });

  it('loads script files', function () {
    assert.isOk(db.namedParam);
  });

  it('preserves directory structure', function () {
    assert.isOk(db.one.two.nestedScript);
  });
});
