## `.find(constraints, [options], cb)`

Returns rows that match the given constraints.

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|constraints|Object&nbsp;&#124;&nbsp;String |An object containing column names and values to find or an ID|
|[options]|Object||
|[options.order]|String||
|[options.stream=false]|Boolean|Returns a stream instead of an array when set to _true_|
|[options.limit=1000]|Number|Limit the rows returned|
|[options.column]|Array|Limit the columns returned|
|cb|Function|A callback that is called with an error object and an array of matching rows, or a single row when an ID is used|


## `.findOne(constraints, [options], cb)`

## `.count(constraints, [params] cb)`

## `.where(constraints, [params], cb)`

## `.search(options, cb)`
