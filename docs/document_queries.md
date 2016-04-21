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
create table doggies(
  id serial primary key,
  body jsonb not null,
  search tsvector,
  created_at timestamptz default now()
);
create index idx_doggies on doggies using GIN(body jsonb_path_ops);
create index idx_doggies_search on doggies using GIN(search);
```

Notice that Massive also creates a GIN index on the body column as well as a `search` field. You can use this to your advantage to make querying documents much, much easier. We're indexing that search field too! All your data will be stored in the `body` column.

## Another Way To Save a Document

Once your table is created, you can query it just like any other table with Massive:

```js
db.doggies.saveDoc({name : "Stinky"}, function(err,doc){
  //hello Stinky!
});
```

You can update as well - but PostgreSQL does not support partial updates, so if you do an update it's a full swap. We're considering supporting partial updates at the code level (basically running a diff) - but this can be quite difficult to get right. For now, it's a full replace:

```js
db.doggies.saveDoc({id : 1, name : "Fido Dido"}, function(err,doc){
  //Fido's name changed
});
```

Saving a document complies with the same rules as table-based queries: *if an id is present, an update will run. If not, it's an insert*.

## Deleting

You delete a document like you would any record since we're using an integer-based key in a relational way:

```js
db.doggies.destroy({id : 2}, function(err,res){
  //stinky smelled horrible
});
```

You can also use JSON-style matchers to find the documents to delete:

```js
db.doggies.destroy({"body ->> 'name'" : "Stinky"}, function(err,res){
  //deletes records where name is "Stinky"
});
```

## Querying

Document tables are still tables, and can be queried directly via the standard `find`, `findOne`, `where`, and `count` functions. Each document will be returned as the `body` field of its containing row.

In order to query fields *in* the document body, you will need to format your criteria appropriately using the Postgres JSON navigation operators `->>` and `#>>`:

```js
db.doggies.find({"body ->> 'name'" : "Fido"}, function (err, res) {
  // All the dogs named Fido
});
```

However, unless you specifically need access to the rest of the document table (other than the primary key, on which [see below](A Word About IDs and Documents), a better way is to use `findDoc`:

```js
db.doggies.findDoc(function (err, res) {
  // All the dogs!
});

db.doggies.findDoc({name : "Fido"}, function (err, res) {
  // All the dogs named Fido
});

db.doggies.findDoc({name : "Fido"}, {order: "body->>'age' desc", limit: 10}, function (err, res) {
  // The ten oldest dogs named Fido
});
```

## Why `findDoc()` Is Preferred

The JSON operator `->>` is a text-matcher and uses the "existence" operator to match the criteria. So the query above would be:

```sql
select * from doggies
where body ->> 'name' ? 'Fido';
```

This runs a full table scan (or a "Sequential Scan") of the data and is not very performant as it does not use the GIN index we built for. If you use `findDoc()` however, we'll use the containment operator `@>`:

```sql
select * from doggies
where body -> 'name' @> 'Fido';
```

This query will take full advantage of our index.

## Full Text Queries

You can execute Full Text queries on the fly with Massive:

```js
db.doggies.searchDoc({
  keys : ["name", "owner"],
  term : "Rusty"
}, function(err, docs){
  //matching docs returned
});
```

With limit and offset
```js
db.doggies.searchDoc({
  keys : ["name", "owner"],
  term : "Rusty"
  }, {
    limit: 10,
    offset: 20
  }
}, function(err, docs){
  //matching docs returned
});
```

## A Word About IDs and Documents

We need to give every row in our document table a primary key - this is still a relational system. If you allow Massive to create the table, this will be a serial integer by default, but if you create or modify your own, UUIDs are also supported.

When we save your document we pull the primary key off to save space. When you query it, we return only the body column and push the id back on for you. This reduces redundancy and even though it's a small bit of space, it's something.
