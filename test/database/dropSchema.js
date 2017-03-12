'use strict';

describe("dropSchema", function() {
  let db;
  const schemaName = "spec";
  const tableName = "doggies";
  const schemaTableName = schemaName + "." + tableName;

  before(function() {
    return resetDb("empty").then(instance => db = instance);
  });

  beforeEach(function() {
    return db.createSchema(schemaName).then(db.createDocumentTable.bind(db, schemaTableName));
  });

  after(function() {
    return db.dropSchema(schemaName, {cascade: true});
  });

  it("removes a schema and underlying table with cascade option", function() {
    return db.dropSchema(schemaName, {cascade: true}).then(() => {
      assert.isUndefined(db[schemaName]);
    });
  });

  it("fails to remove schema and underlying tables without cascade", function() {
    return db.dropSchema(schemaName, {cascade: false}).catch(err => {
      assert.isOk(err !== null, "should callback with error");
    });
  });
});
