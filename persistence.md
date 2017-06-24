# Persistence

Massive's lack of entity modeling means it retrieves your data in the form of plain JavaScript objects and arrays, and _storing_ your data is no different. The use of objects instead of models makes persistence an extremely flexible proposition: you can write what you want when you want and, unlike with object-relational models, ignore anything you don't know. The persistence methods operate only on the columns you specify, and leave all others with the existing or default value, as appropriate.

## save

`save` performs an upsert. On initialization, Massive records your tables' primary key information and uses this to determine whether the object passed to `save` represents a new or an existing row and invokes `insert` or `update` appropriately. The promise `save` returns will resolve to the created or modified data.

`save` may not be used with foreign tables, since they do not have primary keys to test.

```javascript
db.tests.save({
  version: 1,
  name: 'homepage'
}).then(tests => {
  // an array containing the newly-inserted test
});

db.tests.save({
  id: 1,
  version: 2,
  priority: 'high'
}).then(tests => {
  // an array containing the updated test; note that the name
  // will not have changed!
});
```

### insert

`insert` takes an object and returns a promise for an array containing the inserted data.

```javascript
db.tests.insert({
  name: 'homepage',
  version: 1,
}).then(tests => {
  // an array containing the newly-inserted test
});
```

You can insert multiple rows at once -- just pass an array:

```javascript
db.tests.insert([{
  name: 'homepage',
  version: 1
}, {
  name: 'about us',
  version: 1
}]).then(tests => {
  // an array containing both newly-inserted tests
});
```

## update

`update` has two variants. Passed an object with a value for the table's primary key field, it updates all included fields of the object based on the primary key; or, passed a criteria object and a changes map, it applies all changes to all rows matching the criteria. Only the criteria-changes variant can be used with foreign tables.

Both `update` functions return promises for arrays containing the updated data.

```javascript
db.tests.update({
  id: 1,
  version: 2,
  priority: 'high'
}).then(tests => {
  // an array containing the updated test
});

db.tests.update({
  priority: 'high'
}, {
  priority: 'moderate'
}).then(tests => {
  // an array containing all tests which formerly had
  // priority 'high'. Since this issues a prepared
  // statement, note that the version field cannot
  // be incremented here!
});
```

## destroy

`destroy` removes data matching a criteria object, and returns a promise for an array containing the deleted data.

```javascript
db.tests.destroy({
  priority: 'high'
}).then(tests => {
  // an array containing all removed tests
});
```
