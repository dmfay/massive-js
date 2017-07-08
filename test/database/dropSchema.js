'use strict';

describe('dropSchema', function() {
  let db;
  const schemaName = 'spec';

  before(function () {
    return resetDb('empty').then(instance => db = instance);
  });

  beforeEach(function() {
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

  it('removes tables with cascade specified', function* () {
    yield db.createDocumentTable(`${schemaName}.mydocs`);

    assert.lengthOf(db.tables, 1);

    yield db.dropSchema(schemaName, {cascade: true});

    assert.isUndefined(db[schemaName]);
    assert.lengthOf(db.tables, 0);
  });

  it('removes views with cascade specified', function* () {
    yield db.query(`CREATE VIEW ${schemaName}.myview AS SELECT 1;`);
    yield db.reload();

    assert.lengthOf(db.views, 1);

    yield db.dropSchema(schemaName, {cascade: true});

    assert.isUndefined(db[schemaName]);
    assert.lengthOf(db.views, 0);
  });

  it('removes functions with cascade specified', function* () {
    const originalCount = db.functions.length;

    yield db.query(`CREATE OR REPLACE FUNCTION ${schemaName}.get_number() RETURNS int AS $$ SELECT 1; $$ LANGUAGE SQL;`);
    yield db.reload();

    assert.lengthOf(db.functions, originalCount + 1);

    yield db.dropSchema(schemaName, {cascade: true});

    assert.isUndefined(db[schemaName]);
    assert.lengthOf(db.functions, originalCount);
  });

  it('fails if tables exist and cascade is not specified', function* () {
    yield db.createDocumentTable(`${schemaName}.mydocs`);

    assert.lengthOf(db.tables, 1);

    return db.dropSchema(schemaName, {cascade: false}).catch(err => {
      assert.isOk(err);
      assert.isOk(db[schemaName]);
      assert.lengthOf(db.tables, 1);
    });
  });

  it('fails if views exist and cascade is not specified', function* () {
    yield db.query(`CREATE VIEW ${schemaName}.myview AS SELECT 1;`);
    yield db.reload();

    assert.lengthOf(db.views, 1);

    return db.dropSchema(schemaName, {cascade: false}).catch(err => {
      assert.isOk(err);
      assert.isOk(db[schemaName]);
      assert.lengthOf(db.views, 1);
    });
  });

  it('fails if functions exist and cascade is not specified', function* () {
    const originalCount = db.functions.length;

    yield db.query(`CREATE OR REPLACE FUNCTION ${schemaName}.get_number() RETURNS int AS $$ SELECT 1; $$ LANGUAGE SQL;`);
    yield db.reload();

    assert.lengthOf(db.functions, originalCount + 1);

    return db.dropSchema(schemaName, {cascade: false}).catch(err => {
      assert.isOk(err);
      assert.isOk(db[schemaName]);
      assert.lengthOf(db.functions, originalCount + 1);
    });
  });
});
