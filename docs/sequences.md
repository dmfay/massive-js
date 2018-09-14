# Sequences

Sequences are the counters which back up `SERIAL` and `BIGSERIAL` columns. When used as table primary keys, sequences operate transparently and give their next values to rows as they're inserted. However, sequences can also be used independently, in which case it can be useful to know certain things about their state.

Massive only loads independent sequences and ignores those which back table primary keys.

<!-- vim-markdown-toc GFM -->

* [lastValue](#lastvalue)

<!-- vim-markdown-toc -->

## lastValue

`lastValue` returns the current value of the sequence counter. This value may not actually reside anywhere in the database! When a sequence is incremented, the value is reserved even if the transaction which caused the incrementation fails.

```javascript
db.mysequence.lastValue().then(val => {
  // val is a number
});
```
