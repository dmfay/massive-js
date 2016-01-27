## Full text search

Massive comes with support for full text search built-in.

### Running a simple search

To search for matching rows in a table, specify the columns that you'd like to search and the term you'd like to find:

```js
db.users.search({columns: ["email", "name"], term: "rob"}, function(err,users){
  //all users with the word 'rob' in their email or name
});
```

### Searching JSONB documents

If you take advantage of Massive's support for [document queries](http://massive-js.readthedocs.org/en/latest/document_queries/), you can use `searchDoc` to search for documents that match a given term. Specify the keys that you'd like to search and the term you'd like to find:

```js
db.my_documents.searchDoc({
  keys : ["title", "description"],
  term : "Kauai"
}, function(err,docs){
  //all documents with 'Kauai' in their title or description fields
});
```
