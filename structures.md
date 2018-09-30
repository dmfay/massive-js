# Database Structures

Besides tables, views, and functions, Massive provides visibility into other minor database structures.

<!-- vim-markdown-toc GFM -->

* [Enums](#enums)
* [Sequences](#sequences)
  * [lastValue](#lastvalue)
  * [nextValue](#nextvalue)
  * [reset](#reset)

<!-- vim-markdown-toc -->

## Enums

An enumeration is a data type which represents one of a fixed set of text values. They can make convenient replacements for lookup tables, so long as existing values are truly fixed (values may be added but not removed).

Enums are fully loaded on startup and can be accessed through the `db.enums` property:

```javascript
db.enums.myenum; // -> ['one', 'two', 'three'];
```

Note that if you add new values to the enum you must either separately append them to `db.enums` _or_ invoke `db.reload()` to stay up to date.

## Sequences

Sequences are the counters which back up `SERIAL` and `BIGSERIAL` columns. When used as table primary keys, sequences operate transparently and give their next values to rows as they're inserted. However, sequences can also be used independently, in which case it can be useful to know certain things about their state.

Massive only loads independent sequences and ignores those which back table primary keys.

### lastValue

`lastValue` returns the current value of the sequence counter. This value may not actually reside anywhere in the database! When a sequence is incremented, the value is reserved even if the transaction which caused the incrementation fails.

```javascript
db.mysequence.lastValue().then(val => {
  // val is a number
});
```

### nextValue

`nextValue` increments the sequence counter and returns the latest value.

```javascript
db.mysequence.nextValue().then(val => {
  // val is a number
});
```

### reset

`reset` starts the sequence over at 1 (if called without arguments) or a value of your choosing.

```javascript
db.mysequence.reset(123).then(() => {
  // reset does not return a value, but the next value
  // acquired from the sequence will be 123.
});
```
