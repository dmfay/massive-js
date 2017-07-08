'use strict';

const Table = require('../../lib/table');

describe('initialization', function () {
  let db;

  before(function(){
    return resetDb().then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('loads document tables in public and in other schemata', function () {
    assert.instanceOf(db.docs, Table);
    assert.isFunction(db.docs.findDoc);
    assert.isFunction(db.docs.saveDoc);
    assert.isFunction(db.docs.searchDoc);
    assert.isFunction(db.docs.modify);

    assert.instanceOf(db.myschema.docs, Table);
    assert.isFunction(db.myschema.docs.findDoc);
    assert.isFunction(db.myschema.docs.saveDoc);
    assert.isFunction(db.myschema.docs.searchDoc);
    assert.isFunction(db.myschema.docs.modify);
  });
});
