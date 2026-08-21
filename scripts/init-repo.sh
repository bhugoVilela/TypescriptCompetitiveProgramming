#!/usr/bin/env sh
set -e

echo "npm install"
npm install

echo "updating submodules"
git submodule update

echo "Compiling UnboundedTypeScript"
cd UnboundedTypeScript

echo "installing deps"
npm install

echo "building compiler"
npm run build:compiler

cd -

echo "done"
