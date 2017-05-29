# Criteria Objects

Many Massive functions use criteria objects to build `WHERE` clauses. Although they are principally used in query functions, there are other uses for them. In particular, bulk updates use criteria objects to filter data being modified.

A criteria object is a "plain old JavaScript object" where keys represent the fields to search and values are prepared statement parameters.

```javascript
// this will search for all active records where the name
// contains 'homepage' and the JSON 'stats' field shows
// more than 5 runs

const criteria = {
  is_active: true,
  'name like': '%homepage%',
  'stats ->> runs >': 5
};
```

## Operations

Keys in a criteria object may contain an operator which is converted to a SQL operator in the `WHERE` clause. If no operator is provided, the predicate will test for equality.

Text operators are case-insensitive.

### Scalar Comparison

| Format | SQL operator | Description|
|--------|--------------|------------|
| nothing or `=` | `=` | Equality |
| `!`, `!=`, `<>` | `<>` | Inequality |
| `<` | `<`| Less than |
| `<=` | `<=` | Less than or equal |
| `>` | `>` | Greater than |
| `>=` | `>=` | Greater than or equal |
| `BETWEEN` | `BETWEEN` | Test whether value is between a lower and upper bound |
| `IS DISTINCT FROM` | `IS DISTINCT FROM` | Difference test with `NULL` considered a fixed value |
| `IS NOT DISTINCT FROM` | `IS NOT DISTINCT FROM` | Equality test with `NULL` considered a fixed value |

### Arrays

| Format | SQL operator | Description|
|--------|--------------|------------|
| `@>` | `@>` | Array contains |
| `<@` | `<@` | Array contained in |
| `&&` | `&&` | Array overlaps |

### Pattern Matching

| Format | SQL operator | Description|
|--------|--------------|------------|
| `~~`, `LIKE` | `LIKE` | Case-sensitive string equality with `%` and `_` wildcards |
| `!~~`, `NOT LIKE` | `NOT LIKE` | Case-sensitive string difference with `%` and `_` wildcards |
| `~~*`, `ILIKE` | `ILIKE` | Case-insensitive string equality with `%` and `_` wildcards |
| `!~~*`, `NOT ILIKE` | `NOT ILIKE` | Case-insensitive string difference with `%` and `_` wildcards |

### Regular Expressions

| Format | SQL operator | Description|
|--------|--------------|------------|
| `SIMILAR TO` | `SIMILAR TO` | SQL regular expression match |
| `NOT SIMILAR TO` | `NOT SIMILAR TO` | SQL regular expression mismatch |
| `~` | `~` | Case-sensitive POSIX regular expression match |
| `!~` | `!~` | Case-sensitive POSIX regular expression mismatch |
| `~*` | `~*` | Case-insensitive POSIX regular expression match |
| `!~*` | `!~*` | Case-insensitive POSIX regular expression mismatch |

## Casting

PostgreSQL can cast values with the `::` operator. Massive's criteria object supports this exactly as in SQL. For example, to convert a UUID field to TEXT for pattern matching, you could create a criteria object as follows:

```javascript
const criteria = {
  'my_uuid::text LIKE': '12345%'
};
```

## JSON Traversal

Massive supports searching in JSON and JSONB fields using the common traversal operators. You can quote fields yourself or leave it up to the parser.

JSON traversal operators and SQL operations may be combined.

`field ->> key` generates a predicate in the `WHERE` clause testing the value at `field.key`. 

`field #>> {one, two, three}` generates a predicate in the `WHERE` clause testing the deeply-nested value at `field.one.two.three`.
