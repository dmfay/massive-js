#!/bin/bash

echo "determining version"

# exit with error if we can't determine the version

type jq >/dev/null 2>&1 && { VERSION=$(jq .version package.json); } || exit 1

echo "using version $VERSION"

echo "preparing gh-pages branch"

# get the current branch name and commit SHA

BRANCH=$(git symbolic-ref --short HEAD)
COMMIT=$(git rev-parse --short "$BRANCH")

git checkout gh-pages

echo "cleaning workspace"

# the gh-pages gitignore is customized and needs to be kept

git clean -dfqx
git ls-tree --name-only gh-pages | grep -v "\(.gitignore\)" | xargs -I {} rm -r {}

echo "checking out documentation from $BRANCH"

git checkout "$BRANCH" -- docs

mv docs/* .

rm -r docs

# finally commit the updated docs

git add .

git commit -m "regenerate documentation for $VERSION ($BRANCH $COMMIT)"

# return to pre-version state

git checkout "$BRANCH"

echo "docs updated, remember to push the gh-pages branch!"
