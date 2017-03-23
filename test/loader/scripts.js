'use strict';

const path = require('path');
const loader = require('../../lib/loader/scripts');

describe('scripts', function () {
  let db;

  before(function* () {
    db = yield resetDb();
  });

  it('should query for a list of scripts', function* () {
    const scripts = yield loader(db, {scripts: path.resolve(__dirname, '../helpers/scripts')});

    assert.isArray(scripts);
    assert.lengthOf(scripts, 11);
    assert.isTrue(scripts[0].hasOwnProperty('name'));
    assert.isTrue(scripts[0].hasOwnProperty('schema'));
    assert.isTrue(scripts[0].hasOwnProperty('sql'));
    assert.isTrue(scripts[0].hasOwnProperty('filePath'));
  });
});
