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
|[conditions]|Object&nbsp;&#124;&nbsp;String&nbsp;&#124;&nbsp;Number |An object containing fields to match, or a string or number to find a row by its ID|
|[options]|Object||
|[options.order]|String||
|[options.stream=false]|Boolean|Returns a stream instead of an array when set to _true_|
|[options.limit]|Number|Limits the number of rows returned|
|[options.column]|Array|Limits the columns returned|
|cb|Function| A function called with an optional error and an array of matching rows. When an ID is used only a single object is returned.|

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
|[conditions]|Object&nbsp;&#124;&nbsp;String&nbsp;&#124;&nbsp;Number |An object containing fields to match, or a string or number to find a row by its ID|
|[options]|Object||
|[options.order]|String||
|[options.column]|Array|Limits the columns returned|
|cb|Function| A function called with an optional error and an object. If a matching row cannot be found, the second callback argument is `undefined`. |

## `.count(conditions, [params] cb)`

## `.where(conditions, [params], cb)`

## `.search(options, cb)`

## `.insert(data, cb)`

## `.update(conditions, data, cb)`

## `.save(data, cb)`

## `.destroy(conditions, cb)`
