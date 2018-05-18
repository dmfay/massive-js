'use strict';

const stream = require('stream');
const SingleValueStream = require('../../lib/util/single-value-stream');

describe('SingleValueStream', function () {
  it('pipes values through singleValue', function () {
    return new Promise((resolve, reject) => {
      let count = 0;

      const r = new stream.Readable({objectMode: true});
      r.on('error', reject);

      const w = new stream.Writable({objectMode: true});
      w.on('error', reject);
      w.on('finish', () => {
        assert.equal(count, 1);
        resolve();
      });

      w._write = (chunk, enc, next) => {
        assert.equal(chunk, 'value');
        count++;
        next();
      };

      r.pipe(new SingleValueStream()).pipe(w);
      r.push({field: 'value'});
      r.push(null);
    });
  });

  it('raises errors', function () {
    return new Promise((resolve, reject) => {
      let count = 0;

      const r = new stream.Readable({objectMode: true});
      r.on('error', reject);

      const w = new stream.Writable({objectMode: true});
      w.on('error', reject);
      w.on('finish', () => {
        assert.equal(count, 1);
        resolve();
      });

      w._write = (chunk, enc, next) => {
        assert.equal(chunk, 'value');
        count++;
        next();
      };

      const t = new SingleValueStream();
      t.on('error', reject);

      r.pipe(t).pipe(w);
      r.push({field: 'value', otherfield: 'othervalue'});
      r.push(null);
    }).then(() => { assert.fail(); }).catch(() => {});
  });

  describe('singleValue', function () {
    it('returns the value of a single-key map', function () {
      assert.equal(SingleValueStream.singleValue({field: 'value'}), 'value');
    });

    it('raises an error if the map does not contain one and only one field', function () {
      assert.throws(() => SingleValueStream.singleValue({}), Error);
      assert.throws(() => SingleValueStream.singleValue({field: 'value', otherfield: 'othervalue'}), Error);
    });
  });
});
