# Tasks and Transactions

Tasks let you reuse the same connection for multiple statements, avoiding the overhead of acquiring and releasing the connection in between. The task connection is only released once the task has completed, returning a resolved promise, or failed and returned a rejected promise. However, in the latter case, anything executed before the failure will still have been applied to the database state. If you're not careful, this could lead to inconsistent data.

Database transactions are similar to tasks, except they're all-or-nothing: if any individual statement fails to complete, the whole set is rolled back -- as if none of them had ever executed in the first place. Only when the final statement has completed can the transaction be _committed_ into the database. Script files and functions naturally execute in a single transaction, but the Massive API allows complex workflows to be broken apart and processed safely.

<!-- vim-markdown-toc GFM -->

* [Starting a Task or Transaction](#starting-a-task-or-transaction)
* [Options](#options)

<!-- vim-markdown-toc -->

## Starting a Task or Transaction

Begin a task with the `db.withConnection` method, or a transaction with `db.withTransaction`. Each takes as its first argument a function, presumably involving Massive API calls, which returns a promise. The function will be passed a copy of the `db` object with all your tables, views, functions, and scripts attached, but which routes all database calls through the task or transaction.

```javascript
db.withTransaction(tx => {
  let txPromise = tx.users.findOne();
  let txUser;

  txPromise = txPromise.then(user => {
    txUser = user;  // cache for later

    return tx.tests.insert({
      user_id: user.id,
      name: 'sample test'
    });
  });

  txPromise = txPromise.then(test => {
    return tx.issues.insert([{
      summary: 'sample issue 1'
    }, {
      summary: 'sample issue 2'
    }]);
  });

  txPromise = txPromise.then(issues => {
    return tx.users.save({
      id: txUser.id,
      tests_started: txUser.tests_started + 1
    });
  });

  return txPromise;
});
```

Since this example uses `withTransaction`, the transaction will be rolled back if an error causes `txPromise` to reject at any point. If all statements are successful, a new test is started, issues are created, and the user is updated!

## Options

`db.withConnection` and `db.withTransaction` may each take a second `options` argument.

In `withConnection`, the only functional option is `tag`, which allows tracking queries from the task using [pg-monitor](https://github.com/vitaly-t/pg-monitor).

```javascript
db.withConnection(callback, {
  tag: 'my task'
});
```

In `withTransaction`, the only functional option is `mode`, which describes a [TransactionMode](https://vitaly-t.github.io/pg-promise/txMode.TransactionMode.html).

```javascript
db.withTransaction(callback, {
  mode: new db.pgp.txMode.TransactionMode({
    tiLevel: db.pgp.txMode.isolationLevel.serializable
  })
});
```
