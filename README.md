# Competitive Programming in Typescript's Type System

This repo is the playground for solving problems using only typescript's type system.

## Get Started
```sh
// update submodules and build UnboundedTypescript
./scripts/init-repo.sh
```

## Running the compiler
```sh
node main.js <path_to_file.ts>

# example
node main.js ./problems/hacker-rank/sum-of-odd-elements/peano_numbers.ts
```

## UnboundedTypescript
Is a fork of typescript that removes all recursion limit checks, allowing your types to recurse
deeper without workarounds. 
