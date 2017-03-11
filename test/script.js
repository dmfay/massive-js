'use strict';

describe('Scripts', function () {
  let db;

  before(function() {
    return resetDb('default').then(instance => db = instance);
  });

  describe('initialization', function () {
    it('loads script files', function () {
      assert.isOk(db.inStockProducts);
      assert.isOk(db.productByName);
    });

    it('preserves directory structure', function () {
      assert.isOk(db.commands.newProduct);
      assert.isOk(db.queries.users.allUsers);
    });
  });
});
