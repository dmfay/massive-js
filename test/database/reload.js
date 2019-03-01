'use strict';

describe('reload', function () {
  let db;

  before(function* () {
    const initDb = yield resetDb('multi-schema');

    // reconnect with a pool size of 1 to make it easier to change runtime settings on all connections
    db = yield massive({
      host: global.host,
      user: 'postgres',
      database: 'massive',
      poolSize: 1
    }, massive.loader);

    // close original connection
    yield initDb.instance.$pool.end();
  });

  after(() => db.instance.$pool.end());

  it('defaults currentSchema to "public"', () => {
    assert.equal(db.currentSchema, 'public');
  });

  it('picks up change in current schema', () => {
    return db.query('SET search_path=test')
      .then(() => db.reload())
      .then(() => assert.equal(db.currentSchema, 'test'));
  });
});
