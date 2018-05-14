'use strict';

const docify = require('../../lib/util/docify');

describe('docify', function () {
  it('adds metadata to the body for an object', function () {
    const doc = docify({id: 1, body: {val: 'test'}});

    assert.equal(doc.id, 1);
    assert.equal(doc.val, 'test');
    assert.hasAllKeys(doc, ['id', 'val', 'created_at', 'updated_at']);
  });

  it('adds the row id property to the body for an array of objects', function () {
    const docs = docify([{id: 1, body: {val: 'val1'}}, {id: 2, body: {val: 'val2'}}]);

    assert.lengthOf(docs, 2);
    assert.equal(docs[0].id, 1);
    assert.equal(docs[0].val, 'val1');
    assert.equal(docs[1].id, 2);
    assert.equal(docs[1].val, 'val2');
    assert.hasAllKeys(docs[0], ['id', 'val', 'created_at', 'updated_at']);
    assert.hasAllKeys(docs[1], ['id', 'val', 'created_at', 'updated_at']);
  });

  it('docifies a row without a body', function () {
    assert.deepEqual(docify({id: 1, field: 'value'}), {id: 1, field: 'value'});
  });

  it('returns null if there is no row', function () {
    assert.equal(docify(), null);
  });
});
