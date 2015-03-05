var assert = require("assert");
var parser = require("../lib/arg_parser");
var _ = require("underscore")._;

describe('Argument Parser', function () {
  var parsed;
  it('parses the three main arguments', function () {
    parsed = parser.parse({id : 1}, {option : 1}, function(err,res){});
    assert.equal(parsed.args.id, 1);
    assert.equal(parsed.options.option, 1);
    assert(_.isFunction(parsed.callback));
  });
  it('parses args and opts without callback', function () {
    parsed = parser.parse({id : 1}, {option : 1});
    assert.equal(parsed.args.id, 1);
    assert.equal(parsed.options.option, 1);
    assert(!parsed.callback);
  });
  it('parses args without callback', function () {
    parsed = parser.parse({id : 1});
    assert.equal(parsed.args.id, 1);
    assert(!parsed.options);
    assert(!parsed.callback);
  });
  it('parses args with callback', function () {
    parsed = parser.parse({id : 1}, function(){});
    assert.equal(parsed.args.id, 1);
    assert(!parsed.options);
    assert(_.isFunction(parsed.callback));
  });
  it('parses only callback', function () {
    parsed = parser.parse(function(){});
    assert(!parsed.args);
    assert(!parsed.options);
    assert(_.isFunction(parsed.callback));
  });
  it('parses null and returns default console log callback', function () {
    parsed = parser.parse();
    assert(!parsed.args);
    assert(!parsed.options);
    assert(_.isFunction(parsed.callback));
  });
});