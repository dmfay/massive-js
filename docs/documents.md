# Working With Documents

Around the late 00s, document databases like MongoDB or CouchDB started to be hailed as the next big thing. Modeling data in groups of hierarchies rather than as flat related sets, they made an enormous difference in how applications approached data. Although they were never going to _replace_ relational databases, there are many use cases for which document stores are undeniably better-suited than the traditional RDBMS, so document databases are an important class of datastore in their own right.

PostgreSQL's JSONB functionality allows us to blend relational and document approaches by storing JSON documents in traditional tables. There's a lot to recommend a hybrid data model: in modern applications, a greater or lesser proportion of the data is relational and should be stored and accessed as such, but there's often some information that really is best represented as a rich, nested document with a flexible schema. In pure relational terms, data like this can only be represented through tortuous abstractions (if you've never seen a table with a self-joining foreign key representing a hierarchy, consider yourself fortunate) or as unsearchable, unindexable long text or BLOB fields.

The JSONB type is a great solution to this problem, and Massive takes care of the management overhead with a document table API.

## Document Tables

Document tables exist for the sole purpose of storing JSONB data. Query them through Massive's API, and you get a JSON document which you can modify and persist, all seamlessly. You don't even need to create them ahead of time until you know you need them.

Document tables may be extended with new columns and foreign keys. The `id` type can be changed as well (so long as a default is set such as `uuid_generate_v1mc()` for UUID types) without impeding usage of document table functions. Just don't _remove_ any columns or change their names, since Massive depends on those.

Standard table functions still work on document tables, and can be quite useful especially for extended document tables! Fields in the document can be searched with regular `find` and criteria object fields using JSON traversal to look for `body.myField.anArray[1].aField`. `findDoc` **is still preferred** to JSON queries if at all possible since it uses the `@>` "contains" operator to leverage indexing on the document body to improve performance.

### db.saveDoc

The connected database instance has a `saveDoc` function. Passed a collection name (which can include a non-public schema) and a JavaScript object, this will create the table if it doesn't already exist and write the object to it.

```javascript
db.saveDoc('reports', {
  title: 'Week 12 Throughput',
  lines: [{
    name: '1 East',
    numbers: [5, 4, 6, 6, 4]
  }, {
    name: '2 East',
    numbers: [4, 4, 4, 3, 7]
  }]
}).then(report => {
  // the reports table has been created and the initial document
  // is assigned a primary key value and returned
});
```

If the table already exists, you can still use `db.saveDoc`, but you can also invoke `saveDoc` on the table itself.

## Querying Documents

### countDoc

Like its counterpart, `countDoc` returns the number of extant documents matching a criteria object. Unlike `count`, `countDoc` does not accept a raw SQL `WHERE` definition.

```javascript
db.reports.countDoc({
  'title ilike': '%throughput%'
}).then(reports => {
  // number of matching documents
});
```

### findDoc

`findDoc` locates documents with either a criteria object or a primary key. Simple criteria objects (testing equality only) can leverage the GIN index on the table to improve query speed.

```javascript
db.reports.findDoc(1).then(report => {
  // the report document body with the primary key included
});

db.reports.findDoc({
  'title ilike': '%throughput%'
}).then(reports => {
  // all report documents matching the criteria
});
```

### searchDoc

`searchDoc` performs a full-text search on the document body fields.

```javascript
db.reports.searchDoc({
  fields: ["title", "description"],
  term: "Kauai"
}.then(docs => {
  // reports returned with an on-the-fly full text search
  // for 'Kauai'
});
```

## Persisting Documents

### saveDoc

`saveDoc` inserts or updates a document. If an `id` field is present in the document, the corresponding record will be updated; otherwise, it's inserted. `saveDoc` will replace the entire document and does not update individual fields; to do that, see `modify`.

```javascript
db.reports.saveDoc({
  title: 'Week 12 Throughput',
  lines: [{
    name: '1 East',
    numbers: [5, 4, 6, 6, 4]
  }, {
    name: '2 East',
    numbers: [4, 4, 4, 3, 7]
  }]
}).then(report => {
  // the newly created report
});
```

### modify

`modify` adds and updates fields in an existing document or documents _without_ replacing the entire body. Fields not defined in the `changes` object are not modified. `modify` takes an ID or criteria object, a changes object, and an optional name for the JSON or JSONB column.

This function may be used with any JSON or JSONB column, not just with document tables, but the behavior is slightly different. With document tables, criteria objects will be tested against the document body; with other tables, they will be tested against the row. Likewise, the promise returned will be for the updated document with a document table, or for the entire row with another table.

```javascript
db.reports.modify(1, {
  title: 'Week 11 Throughput'
}).then(report => {
  // the updated report, with a changed 'title' attribute
});

db.products.modify({
  type: 'widget'
}, {
  colors: ['gray', 'purple', 'red']
}, 'info').then(widgets => {
  // an array of widgets, now in at least three colors.
  // since products is not a document table (note the
  // 'info' field was specified to update), the 'type'
  // is tested against a column named type rather than
  // a key in the info JSON or JSONB column.
});
```
