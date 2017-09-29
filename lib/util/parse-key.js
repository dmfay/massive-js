'use strict';

/**
 * Parse out a criterion key into something more intelligible. Massive is more
 * flexible than Postgres' query parser, with more alternate aliases for
 * operations and looser rules about quoting, especially with JSON fields. This
 * necessitates some pretty gnarly parsing.
 *
 * @module util/parseKey
 * @param  {String} key A reference to a database column. The field name may be quoted using double quotes to allow names which otherwise would not conform with database naming conventions. Optional components include, in order, [] and . notation to describe elements of a JSON field; ::type to describe a cast; and finally, an argument to the appendix function.
 * @param {Object} appendix A function which when invoked with an optional component of the key returns a value to be used later. So far used for operations (from {@linkcode where}) and ordering (from {@linkcode order}.
 * @return {Object} An object describing the parsed key.
 */
exports = module.exports = function (key, appendix) {
  key = key.trim();

  const jsonShape = [];       // describe a JSON path: true is a field, false an array index
  let parsed = [[]];          // we're going to collect token arrays
  let buffer = parsed[0];     // start with the first token
  let inQuotedField = false;  // ensure we pick up everything in quotes
  let hasCast = false;        // make sure we pull the appropriate token for castType
  let i = 0;
  let char = key.charAt(i);

  do {
    if (inQuotedField && char !== '"') {
      buffer.push(char);
    } else {
      switch (char) {
        case '"':
          // quoted field
          if (i === 0) {
            inQuotedField = true;   // just starting out, use the initial token
          } else {
            inQuotedField = false;  // finishing the quoted field, new token
            buffer = parsed[parsed.push([]) - 1];
          }

          break;

        case ':':
          // cast; new token, but we ignore the : characters since we only care
          // about type
          if (!hasCast) {
            hasCast = true;

            buffer = parsed[parsed.push([]) - 1];
          }

          break;

        case '.':
          // json path traversal. new token, and note that it's a field to ensure
          // proper element/index handling later.
          jsonShape.push(true);
          buffer = parsed[parsed.push([]) - 1];
          break;

        case '[':
          // json array index. new token, and note that it's an index for later.
          jsonShape.push(false);
          buffer = parsed[parsed.push([]) - 1];
          break;

        case ']':
          // terminate json array index. starts a new token, no jsonShape push
          buffer = parsed[parsed.push([]) - 1];
          break;

        case ' ': case '\t': case '\r': case '\n':
          // whitespace; separates tokens
          buffer = parsed[parsed.push([]) - 1];
          break;

        default:    // eslint-disable-line no-fallthrough
          buffer.push(char);
          break;
      }
    }

    i++;
  } while (char = key.charAt(i)); // eslint-disable-line no-cond-assign

  parsed = parsed.reduce(function (acc, p) {
    const str = p.join('').trim();

    if (str) { acc.push(str); }

    return acc;
  }, []);

  const field = parsed.shift();
  let castType, appended;
  let quotedField = `"${field}"`;

  if (jsonShape.length === 1) {
    if (jsonShape[0]) {
      // object key
      quotedField = `${quotedField}->>'${parsed.shift()}'`;
    } else {
      // array index
      quotedField = `${quotedField}->>${parsed.shift()}`;
    }
  } else if (jsonShape.length > 0) {
    const tokens = parsed.splice(0, jsonShape.length);

    quotedField = `${quotedField}#>>'{${tokens.join(',')}}'`;
  }

  if (hasCast) {
    castType = parsed.shift();

    if (jsonShape.length > 0) {
      quotedField = `(${quotedField})::${castType}`;
    } else {
      quotedField = `${quotedField}::${castType}`;
    }
  }

  if (appendix) {
    // anything remaining goes to appendix

    if (parsed[0]) {
      appended = appendix(parsed.join(' ').toLowerCase());
    } else {
      // TODO move default to operations
      appended = appendix('=');
    }
  }

  return {
    rawField: field,
    field: quotedField,
    appended,
    isJSON: jsonShape.length > 0
  };
};

