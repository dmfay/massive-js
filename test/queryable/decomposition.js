'use strict';

describe('decomposing results', function () {
  let db;

  before(function () {
    return resetDb('decomposition').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  it('applies a schema to decompose results', function* () {
    const issues = yield db.everything.find({}, {
      decompose: {
        pk: 'user_id',
        columns: {
          user_id: 'id',
          username: 'username'
        },
        tests: {
          pk: 'test_id',
          columns: {
            test_id: 'id',
            name: 'name'
          },
          array: true,
          issues: {
            pk: 'id',
            columns: {
              id: 'id',
              user_id: 'user_id',
              test_id: 'test_id',
              description: 'description'
            },
            array: true
          }
        }
      }
    });

    assert.deepEqual(issues, [{
      id: 1,
      username: 'alice',
      tests: [{
        id: 1,
        name: 'alice\'s test',
        issues: [{
          id: 1,
          user_id: 1,
          test_id: 1,
          description: 'alice\'s issue'
        }]
      }]
    }, {
      id: 2,
      username: 'bob',
      tests: []
    }, {
      id: 3,
      username: 'carol',
      tests: [{
        id: 2,
        name: 'carol\'s first test',
        issues: []
      }, {
        id: 3,
        name: 'carol\'s second test',
        issues: [{
          id: 2,
          user_id: 3,
          test_id: 3,
          description: 'carol\'s issue'
        }]
      }]
    }]);
  });

  it('does not work with streaming', function (done) {
    db.everything.find({}, {
      stream: true,
      decompose: {
        pk: 'user_id',
        columns: {
          user_id: 'id',
          username: 'username'
        },
        tests: {
          pk: 'test_id',
          columns: {
            test_id: 'id',
            name: 'name'
          },
          array: true,
          issues: {
            pk: 'id',
            columns: {
              id: 'id',
              user_id: 'user_id',
              test_id: 'test_id',
              description: 'description'
            },
            array: true
          }
        }
      }
    }).then(stream => {
      const result = [];

      stream.on('readable', function () {
        const res = stream.read();

        if (res) {
          result.push(res);
        }
      });

      stream.on('end', function () {
        assert.equal(4, result.length); // decomposition would have collapsed it to 3
        done();
      });
    });
  });
});
