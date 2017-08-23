#!/bin/bash

echo "regenerating API docs"

rm -rf ./docs/api

node_modules/.bin/jsdoc -d ./docs/api -c ./.jsdoc.json -r

echo "committing updated API docs"

git add docs/api

git commit -m "regenerate api docs"
