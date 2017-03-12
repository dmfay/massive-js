'use strict';

const docify = require('../../lib/util/docify');

describe('docify', function () {
  it('adds the row id property to the body for an object', function* () {
    const doc = yield docify({id: 1, body: {val: 'test'}});

    assert.deepEqual(doc, {id: 1, val: 'test'});
  });

  it('adds the row id property to the body for an array of objects', function* () {
    const docs = yield docify([{id: 1, body: {val: 'val1'}}, {id: 2, body: {val: 'val2'}}]);

    assert.lengthOf(docs, 2);
    assert.deepEqual(docs, [{id: 1, val: 'val1'}, {id: 2, val: 'val2'}]);
  });
});
