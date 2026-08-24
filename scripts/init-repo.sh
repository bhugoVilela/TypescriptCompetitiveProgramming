#!/usr/bin/env sh
set -e

echo "updating submodules"
git submodule update --init

echo "installing UnboundedTypeScript deps"
cd UnboundedTypescript
npm install

echo "building compiler"
npm run build:compiler

cd -

echo
echo "done. try:"
echo "  ./bin/tsc --noEmit --noRecursionLimits --printType Result ./problems/hacker-rank/sum-of-odd-elements/peano_numbers.ts"
