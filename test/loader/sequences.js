'use strict';

const loader = require('../../lib/loader/sequences');

describe('sequences', function () {
  let db;

  before(function* () {
    db = yield resetDb('sequences');
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('should query for a list of non-pk sequences', function* () {
    db.loader = _.defaults({allowedSchemas: '', blacklist: '', exceptions: ''}, db.loader);

    const sequences = yield loader(db);

    assert.isArray(sequences);
    assert.lengthOf(sequences, 2);
    assert.isTrue(sequences[0].hasOwnProperty('schema'));
    assert.isTrue(sequences[0].hasOwnProperty('name'));
  });
});
