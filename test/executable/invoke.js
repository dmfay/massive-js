'use strict';

describe('invoke', function () {
  let db;

  before(function () {
    return resetDb('functions').then(instance => db = instance);
  });

  after(function () {
    return db.instance.$pool.end();
  });

  describe('arguments', function () {
    it('invokes a function with no arguments', function () {
      return db.get_number().then(res => {
        assert.equal(res, 1);
      });
    });

    it('invokes a function with no arguments in an empty array', function () {
      return db.get_number([]).then(res => {
        assert.equal(res, 1);
      });
    });

    it('invokes a function with one argument directly', function () {
      return db.single_arg(1).then(res => {
        assert.equal(res, 1);
      });
    });

    it('invokes a function with one argument in an array', function () {
      return db.single_arg([1]).then(res => {
        assert.equal(res, 1);
      });
    });

    it('invokes a function with multiple arguments directly', function () {
      return db.multi_arg(1, 2).then(res => {
        assert.equal(res, 3);
      });
    });

    it('invokes a function with multiple arguments in an array', function () {
      return db.multi_arg([1, 2]).then(res => {
        assert.equal(res, 3);
      });
    });

    it('invokes a script with no parameters', function () {
      return db.noParam().then(res => {
        assert.deepEqual(res, [{'?column?': 1}]);
      });
    });

    it('invokes a script with no parameters in an empty array', function () {
      return db.noParam([]).then(res => {
        assert.deepEqual(res, [{'?column?': 1}]);
      });
    });

    it('invokes a script with prepared statement parameters', function () {
      return db.psParams(1, 2).then(res => {
        assert.equal(res[0][Object.keys(res[0])[0]], 3);
      });
    });

    it('invokes a script with prepared statement parameters in an array', function () {
      return db.psParams([1, 2]).then(res => {
        assert.equal(res[0][Object.keys(res[0])[0]], 3);
      });
    });

    it('invokes a script with something that looks like a parameter', function () {
      return db.falseParam().then(res => {
        assert.equal(res[0][Object.keys(res[0])[0]], '$123');
      });
    });

    it('fails to invoke a script with too few prepared statement parameters', function () {
      return db.psParams(1).then(() => {
        assert.fail();
      }).catch(e => {
        assert.isOk(e);
      });
    });

    it('invokes a script with named parameters', function () {
      return db.namedParam({value: 2}).then(res => {
        assert.equal(res[0][Object.keys(res[0])[0]], 3);
      });
    });

    it('fails to invoke a script with too few named parameters', function () {
      return db.namedParam({}).then(() => {
        assert.fail();
      }).catch(e => {
        assert.isOk(e);
      });
    });

    it('invokes a simple variadic function', function () {
      return db.single_variadic(1, 2, 1, 2).then(res => {
        assert.equal(res, 4);
      });
    });

    it('invokes a variadic function with earlier arguments', function () {
      return db.multi_variadic(10, 2, 1, 2).then(res => {
        assert.equal(res, 13);
      });
    });
  });

  describe('options', function () {
    it('invokes a function with no arguments plus options', function () {
      return db.get_number({single: true}).then(res => {
        assert.equal(res, 1);
      });
    });

    it('invokes a function with no arguments in an empty array plus options', function () {
      return db.get_number([], {single: true}).then(res => {
        assert.equal(res, 1);
      });
    });

    it('invokes a function with one argument directly plus options', function () {
      return db.single_arg(1, {single: true}).then(res => {
        assert.equal(res, 1);
      });
    });

    it('invokes a function with one argument in an array plus options', function () {
      return db.single_arg([1], {single: true}).then(res => {
        assert.equal(res, 1);
      });
    });

    it('invokes a function with multiple arguments directly plus options', function () {
      return db.multi_arg(1, 2, {single: true}).then(res => {
        assert.equal(res, 3);
      });
    });

    it('invokes a function with multiple arguments in an array plus options', function () {
      return db.multi_arg([1, 2], {single: true}).then(res => {
        assert.equal(res, 3);
      });
    });

    it('invokes a script function with no parameters plus options', function () {
      return db.noParam({single: true}).then(res => {
        assert.deepEqual(res, {'?column?': 1});
      });
    });

    it('invokes a script function with no parameters in an empty array plus options', function () {
      return db.noParam([], {single: true}).then(res => {
        assert.deepEqual(res, {'?column?': 1});
      });
    });

    it('invokes a script function with named parameters plus options', function () {
      return db.namedParam({value: 2}, {single: true}).then(res => {
        assert.equal(res[Object.keys(res)[0]], 3);
      });
    });
  });

  describe('return types', function () {
    it('gets primitives', function () {
      return db.get_number().then(res => {
        assert.equal(res, 1);
      });
    });

    it('gets json', function () {
      return db.get_json().then(res => {
        assert.isObject(res);
        assert.equal(res.hello, 'world');
      });
    });

    it('gets arrays', function () {
      return db.get_array().then(res => {
        assert(_.isArray(res));
        assert.equal(res.length, 4);
        assert(res.every(function (e) { return e === 'yes'; }));
      });
    });

    // `pg` module doesn't support arrays of custom types yet
    // see: https://github.com/brianc/node-postgres/issues/986
    it.skip('executes function coin_tosses and returns array of "heads" or "tails"', function () {
      return db.coin_tosses().then(res => {
        assert(Array.isArray(res), 'Expected array');
        res.forEach(function (el) {
          assert(['heads', 'tails'].indexOf(el) >= 0, `${el} must be heads or tails`);
        });
      });
    });

    it('gets enums', function () {
      return db.get_enum().then(res => {
        assert(res === 'heads' || res === 'tails');
      });
    });

    it('gets domains', function () {
      return db.get_domain().then(res => {
        assert.equal(res, 'example@example.com');
      });
    });

    it('gets records', function () {
      return db.get_record().then(res => {
        assert.equal(res.length, 1);
        assert.equal(res[0].id, 1);
        assert.equal(res[0].field1, 'two');
        assert.equal(res[0].field2, 'three');
      });
    });
  });

  describe('comments', function () {
    it('runs a script file containing a commented arg without providing it', function () {
      return db.comment();  // we don't care about the result, just that it executes without error
    });
  });

  describe('streaming function results', function () {
    it('streams a non-single-valued function', function (done) {
      db.get_record({stream: true}).then(stream => {
        const result = [];

        stream.on('readable', function () {
          let res;

          while (res = stream.read()) { // eslint-disable-line no-cond-assign
            if (res) {
              result.push(res);
            }
          }
        });

        stream.on('end', function () {
          assert.deepEqual(result, [{
            id: 1,
            field1: 'two',
            field2: 'three'
          }]);

          done();
        });
      });
    });

    it('pipes a single-valued function through SingleValueStream', function (done) {
      db.regexp_matches('aaaaaaaaaaaaaaaaaaaa', 'a', 'g', {stream: true}).then(stream => {
        const result = [];

        stream.on('readable', function () {
          let res;

          while (res = stream.read()) { // eslint-disable-line no-cond-assign
            if (res) {
              result.push(res);
            }
          }
        });

        stream.on('end', function () {
          assert.equal(20, result.length);
          result.forEach(function (r) {
            assert.equal(r, 'a');
          });

          done();
        });
      });
    });
  });
});
