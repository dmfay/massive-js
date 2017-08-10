'use strict';

describe('reload', function () {
  let db;

  before(() => {
    return resetDb('multi-schema')
      .then((db) => Promise.all([
        // reconnect with a pool size of 1 to make it easier to change runtime settings on all connections
        massive({database: 'massive', poolSize: 1}, db.loader),
        // close original connection
        db.instance.$pool.end(),
      ]))
      .then(([instance]) => db = instance);
  });

  after(() => db.instance.$pool.end());

  it('defaults currentSchema to "public"', () => {
    assert.equal(db.currentSchema, 'public');
  });

  it('picks up change in current schema', () => {
    return db.run('SET search_path=test')
      .then(() => db.reload())
      .then(() => assert.equal(db.currentSchema, 'test'));
  });
});
