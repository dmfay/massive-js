'use strict';

describe("createSchema", function() {
  let db;
  const schemaName = "spec";

  before(function() {
    return resetDb("empty").then(instance => db = instance);
  });

  after(function() {
    return db.dropSchema(schemaName, {cascade: true}).then(() => {
      assert.equal(db[schemaName], undefined);

      return db.instance.$pool.end();
    });
  });

  it("adds a new schema", function() {
    return db.createSchema(schemaName).then(() => {
      assert(_.isEqual(db[schemaName], {}), 'should be an empty object');
    });
  });
});
