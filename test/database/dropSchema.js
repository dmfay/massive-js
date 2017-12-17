'use strict';

describe('dropSchema', function () {
  let db;
  const schemaName = 'spec';

  before(function () {
    return resetDb('empty').then(instance => db = instance);
  });

  beforeEach(function () {
    return db.createSchema(schemaName);
  });

  after(function () {
    return db.dropSchema(schemaName, {cascade: true}).then(() => {
      return db.instance.$pool.end();
    });
  });

  it('removes a schema', function () {
    return db.dropSchema(schemaName).then(() => {
      assert.isUndefined(db[schemaName]);
    });
  });

  it('fails if tables exist and cascade is not specified', function* () {
    yield db.createDocumentTable(`${schemaName}.mydocs`);

    return db.dropSchema(schemaName, {cascade: false}).catch(err => {
      assert.isOk(err);
      assert.isOk(db[schemaName]);
      assert.isOk(db[schemaName].mydocs);
    });
  });
});
