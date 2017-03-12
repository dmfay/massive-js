'use strict';

describe('run', function () {
  let db;

  before(function () {
    return resetDb().then(instance => db = instance);
  });

  it('runs raw unparameterized SQL', function () {
    return db.run("select * from products").then(res => {
      assert.equal(4, res.length);
    });
  });

  it('prepares and runs a statement', function () {
    return db.run("select * from products where id=$1", [1]).then(res => {
      assert.equal(1, res[0].id);
    });
  });
});
