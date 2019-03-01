## Summary
A clear and concise description of the bug or unexpected behavior you're encountering.

## Example
### Database setup
```
CREATE TABLE things (
  id SERIAL PRIMARY KEY,
  stuff TEXT
);
```

### Code demonstrating the behavior
```
db.things.find({ stuff: 'this call is breaking' });
```

## Expected behavior
A clear and concise description of what you expected to happen.

## Actual behavior
Describe what happened instead.

## Additional context
If there's anything else that needs to be clarified
