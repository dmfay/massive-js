## `.find([conditions], [options], cb)`

Returns rows that match the given conditions.

```js
db.products.find({color: 'red'}, function(err, products){
  // returns matching products
});
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|[conditions]|Object&nbsp;&#124;&nbsp;String&nbsp;&#124;&nbsp;Number|An object containing fields to match, or a string or number to find a row by its ID|
|[options]|Object||
|[options.order]|String||
|[options.stream=false]|Boolean|Returns a stream instead of an array when set to _true_|
|[options.limit]|Number|Limits the number of rows returned|
|[options.columns]|Array|Limits the columns returned|
|cb|Function|A function called with an optional error and an array of matching rows. When an ID is used only a single object is returned.|

## `.findOne([conditions], [options], cb)`

Returns the first row that matches the given conditions.

```js
db.products.findOne({color: 'red'}, function(err, product){
  // returns the first matching product
});
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|[conditions]|Object&nbsp;&#124;&nbsp;String&nbsp;&#124;&nbsp;Number|An object containing fields to match, or a string or number to find a row by its ID|
|[options]|Object||
|[options.order]|String||
|[options.columns]|Array|Limits the columns returned|
|cb|Function|A function called with an optional error and an object. If a matching row cannot be found, the second callback argument is `undefined`. |

## `.count([conditions], cb)`

Returns the number of rows that match the given conditions.

```js
db.products.count({color: 'red'}, function(err, count){
  // returns the count of matching products
});
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|[conditions]|Object|An object containing fields to match|
|cb|Function|A function called with an optional error and the count as a number.|

## `.count([where], [params], cb)`

Returns the number of rows that match the given where clause.

```js
db.products.count('color=$1', ['red'], function(err, count){
  // returns the count of matching products
});
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|[where]|String|A simple where clause string|
|[params]|Array|An array containing query parameters|
|cb|Function|A function called with an optional error and the count as a number.|

## `.where([where], [params], cb)`

Returns rows that match the given where clause.

```js
db.products.where('color=$1', ['red'], function(err, products){
  // returns matching products
});
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|[where]|String|A simple where clause string|
|[params]|Array|An array containing query parameters|
|cb|Function|A function called with an optional error and an array of matching rows.|

## `.search(options, cb)`

Returns rows that match a given search term.

```js
db.products.search({columns: ["name", "description"], term: "red"}, function(err, products){
  // returns matching products
});
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|options|Object||
|[options.columns]|Array|An array of columns to search|
|[options.term]|String|A search term|
|cb|Function|A function called with an optional error and an array of matching rows.|

## `.insert(data, cb)`

Inserts a new row into the table.

```js
db.products.insert({color: "red"}, function(err, result){
  // returns the created row
});
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|data|Object&nbsp;&#124;&nbsp;Array&nbsp;|An object containing the row data, or an array of objects to insert multiple rows at once|
|cb|Function|A function called with an optional error and the created row or an array of created rows when inserting multiple rows at once.|

## `.update(conditions, data, cb)`

## `.save(data, cb)`

## `.destroy(conditions, cb)`
