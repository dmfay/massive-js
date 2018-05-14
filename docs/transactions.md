# Transactions

Database transactions batch multiple statements in an all-or-nothing group: if any individual statement fails to complete, the whole set is rolled back -- as if none of them had ever executed in the first place. Only when the final statement has completed can the transaction be _committed_ into the database. This allows complex workflows to be broken apart and processed safely.

Script files and functions execute in a single transaction naturally, but working with Massive's queryable and table API requires invoking `db.withTransaction` with a callback function containing the statements to be executed inside the transaction scope.

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
});
```

If an error is raised at any point in this callback, the transaction is rolled back. If all statements are successful, a new test is started, issues are created, and the user is updated!

`db.withTransaction` may take a second `options` argument which defines behavior for the transaction scope. Currently, the only field is `mode`, which describes a [TransactionMode](https://vitaly-t.github.io/pg-promise/txMode.TransactionMode.html).

```javascript
db.withTransaction(callback, {
  mode: new db.pgp.txMode.TransactionMode({
    tiLevel: db.pgp.txMode.isolationLevel.serializable
  });
});
```
