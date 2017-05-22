# Working With Documents

Around the late 00s, document databases like MongoDB or CouchDB started to be hailed as the next big thing. Modeling data in groups of hierarchies rather than as flat related sets, they made an enormous difference in how applications approached data. Although they were never going to _replace_ relational databases, there are many use cases for which document stores are undeniably better-suited than the traditional RDBMS, so document databases are an important class of datastore in their own right.

PostgreSQL's JSONB functionality allows us to blend relational and document approaches by storing JSON documents in traditional tables. There's a lot to recommend a hybrid data model: in modern applications, a greater or lesser proportion of the data is relational and should be stored and accessed as such, but there's often some information that really is best represented as a rich, nested document with a flexible schema. In pure relational terms, data like this can only be represented through tortuous abstractions (if you've never seen a table with a self-joining foreign key representing a hierarchy, consider yourself fortunate) or as unsearchable, unindexable long text or BLOB fields.

The JSONB type is a great solution to this problem, and Massive takes care of the management overhead with a document table API.

## Document Tables

Document tables exist for the sole purpose of storing JSONB data. Query them through Massive's API, and you get a JSON document which you can modify and persist, all seamlessly. You don't even need to create them ahead of time until you know you need them.

Standard table functions still work on document tables, and can be quite useful! Fields in the document can be searched with regular `find` and criteria object fields using JSON traversal to look for `body ->> myField`.

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
  keys : ["title", "description"],
  term : "Kauai"
}.then(docs => {
  // reports returned with an on-the-fly full text search
  // for 'Kauai'
});
```

## Persisting Documents

### saveDoc

`saveDoc` inserts or updates a document. If an `id` field is present in the document, the corresponding record will be updated; otherwise, it's inserted.

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

### setAttribute

> TODO
