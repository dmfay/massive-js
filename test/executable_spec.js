'use strict';
describe("Executables", function () {
  let db;

  before(function() {
    return resetDb("functions").then(instance => db = instance);
  });

  describe("initialization", function () {
    it("loads functions", function () {
      assert.isOk("db.all_products");
    });

    it("handles casing and schema", function* () {
      let res;

      assert.isOk(db.get_number);
      res = yield db.get_number();
      assert.equal(res, 1);

      assert.isOk(db.GetNumber);
      res = yield db.GetNumber();
      assert.equal(res, 2);

      assert.isOk(db.one.get_number);
      res = yield db.one.get_number();
      assert.equal(res, 3);

      assert.isOk(db.one.GetNumber);
      res = yield db.one.GetNumber();
      assert.equal(res, 4);
    });

    it("loads query files", function () {
      assert.isOk("db.inStockProducts");
    });
  });

  describe("invocation and arguments passing", function () {
    it("invokes a function with no arguments", function () {
      return db.get_number().then(res => {
        assert.equal(res, 1);
      });
    });

    it("invokes a function with one argument directly", function () {
      return db.single_arg(1).then(res => {
        assert.equal(res, 1);
      });
    });

    it("invokes a function with one argument in an array", function () {
      return db.single_arg([ 1 ]).then(res => {
        assert.equal(res, 1);
      });
    });

    it("invokes a function with multiple arguments directly", function () {
      return db.multi_arg(1, 2).then(res => {
        assert.equal(res, 3);
      });
    });

    it("invokes a function with multiple arguments in an array", function () {
      return db.multi_arg([ 1, 2 ]).then(res => {
        assert.equal(res, 3);
      });
    });
  });

  describe("return types", function () {
    it("gets primitives", function () {
      return db.get_number().then(res => {
        assert.equal(res, 1);
      });
    });

    it("gets json", function () {
      return db.get_json().then(res => {
        assert(_.isObject(res));
        assert.equal(res.hello, "world");
      });
    });

    it("gets arrays", function () {
      return db.get_array().then(res => {
        assert(_.isArray(res));
        assert.equal(res.length, 4);
        assert(res.every(function (e) { return e === "yes"; }));
      });
    });

    /*
    // `pg` module doesn"t support arrays of custom types yet
    // see: https://github.com/brianc/node-postgres/issues/986
    it("executes function coin_tosses and returns array of "heads" or "tails"", function () {
      return db.coin_tosses().then(res => {
        console.dir(res);
        assert(Array.isArray(res), "Expected array");
        res.forEach(function(el) {
          assert(["heads", "tails"].indexOf(el) >= 0, """ + el + "" must be heads or tails");
        });
      });
    });
    */

    it("gets enums", function () {
      return db.get_enum().then(res => {
        assert(res === "heads" || res === "tails");
      });
    });

    it("gets domains", function () {
      return db.get_domain().then(res => {
        assert.equal(res, "example@example.com");
      });
    });

    it("gets records", function () {
      return db.get_record().then(res => {
        assert.equal(res.length, 1);
        assert.equal(res[0].id, 1);
        assert.equal(res[0].field1, "two");
        assert.equal(res[0].field2, "three");
      });
    });
  });

  describe("streaming function results", function () {
    it("executes citext-added function regexp_matches and returns stream of matches", function (done) {
      db.regexp_matches("aaaaaaaaaaaaaaaaaaaa", "a", "g", {stream: true}).then(stream => {
        const result = [];

        stream.on("readable", function() {
          const res = stream.read();

          if (res) {
            result.push(res);
          }
        });

        stream.on("end", function () {
          assert.equal(20, result.length);
          result.forEach(function(r) {
            assert.equal(r, "a");
          });

          done();
        });
      });
    });
  });
});
