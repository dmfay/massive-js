## Working with JSONB

Massive supports the `jsonb` data type in PostgreSQL completely. If you want to use PostgreSQL as a document database, we can help! From creating a table for you to quick inserts and queries - storing document data with Massive is pretty simple.

## Saving a Document

To save a document with Massive you can use the `saveDoc()` method:

```js
db.saveDoc("doggies", {name : "Fido", age : 10}, function(err,doc){
  //the new document, with id, is returned
});
```

Massive does two things here:

 - Create a special table for you on the fly
 - Add your first document, "Fido" and return it to you

The table it creates looks like this:

```sql
create table %s(
  id serial primary key,
  body jsonb not null,
  search tsvector,
  created_at timestamptz default now()
);
create index idx_%s on %s using GIN(body jsonb_path_ops); 
create index idx_%s_search on %s using GIN(search); 
```

Notice that Massive also creates a GIN index on the body column as well as a `search` field. You can use this to your advantage to make querying documents much, much easier. We're indexing that search field too! All your data will be stored in the `body` column.

