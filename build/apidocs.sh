#!/bin/bash

echo "regenerating API docs"

npm run docs

echo "committing updated API docs"

git add docs/api

git commit -m "regenerate api docs"
