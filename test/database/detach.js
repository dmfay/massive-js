'use strict';

const Executable = require('../../lib/executable');
const Writable = require('../../lib/writable');

describe('detaching entities', function () {
  let db;

  before(function () {
    return resetDb('loader').then(instance => db = instance);
  });

  beforeEach(function* () {
    db = yield db.reload();
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('removes entities from the tree and object list', function () {
    const originalLength = db.objects.length;

    db.attach(new Writable({
      schema: 'public',
      name: 'mytable',
      db
    }));

    assert.lengthOf(db.objects, originalLength + 1);
    assert.isOk(db.mytable);
    assert.isTrue(db.mytable instanceof Writable);

    db.detach('mytable');

    assert.lengthOf(db.objects, originalLength);
    assert.notOk(db.mytable);
  });

  it('removes merged entities', function () {
    const originalLength = db.objects.length;

    db.attach(new Writable({
      schema: 'public',
      name: 'table_or_script',
      db
    }));

    db.attach(new Executable({
      name: 'table_or_script',
      path: 'table_or_script',
      sql: 'select 1 as val',
      paramCount: 0,
      db
    }));

    assert.lengthOf(db.objects, originalLength + 2);
    assert.isOk(db.table_or_script);
    assert.isTrue(db.table_or_script instanceof Writable);
    assert.isFunction(db.table_or_script);

    db.detach('table_or_script');

    assert.lengthOf(db.objects, originalLength);
    assert.notOk(db.table_or_script);
  });

  it('removes entities in nested paths', function () {
    const originalLength = db.objects.length;

    db.attach(new Executable({
      name: 'myscript',
      path: 'outer.inner.myscript',
      sql: 'select 1 as val',
      paramCount: 0,
      db
    }));

    assert.lengthOf(db.objects, originalLength + 1);
    assert.isOk(db.outer.inner.myscript);
    assert.isFunction(db.outer.inner.myscript);

    db.detach('outer.inner.myscript');

    assert.lengthOf(db.objects, originalLength);
    assert.notOk(db.outer.inner.myscript);
  });
});
