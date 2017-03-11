'use strict';
let db;

describe("On spin up", function () {
  before(function() {
    return resetDb("loader").then(instance => db = instance);
  });

  it("returns a valid db interface", function () {
    assert.isOk(db);
    assert.isOk(db.tables);
    assert.isOk(db.queryFiles);
  });

  it("loads non-public schemata as namespace properties", function () {
    assert.isOk(db.one);
    assert.isOk(db.two);
    assert.isOk(db.one.t1);
    assert.isOk(db.one.v1);
    assert.isOk(db.one.f1);

    assert.eventually.equal(db.one.t1.count(), 0);
  });

  it("loads all tables", function () {
    assert.equal(db.tables.length, 6);
  });

  it("loads all views", function () {
    assert.equal(db.views.length, 6);
  });

  it("loads query files", function () {
    assert.ok(db.queryFiles.length > 0);
  });

  it("loads functions", function () {
    assert.equal(db.functions.length, 4);
  });
});
