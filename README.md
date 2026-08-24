# Competitive Programming in Typescript's Type System

This repo is the playground for solving problems using only typescript's type system.

## Get Started
```sh
# update submodules and build UnboundedTypescript
./scripts/init-repo.sh
```

## Running a solution
Write your answer as a type alias called `Result`, then ask the compiler to evaluate it:

```sh
./bin/tsc --noEmit --noRecursionLimits --printType Result <path_to_file.ts>

# example
./bin/tsc --noEmit --noRecursionLimits --printType Result ./problems/hacker-rank/sum-of-odd-elements/peano_numbers.ts
# 2500
```

`bin/tsc` is a thin wrapper around the local build that raises the process stack and heap before
handing over to node — without it, a type that recurses without tail calls hits V8's call-stack
limit long before it reaches anything interesting. `npm link` puts it on your `PATH` as plain
`tsc` if you'd rather not type the path. Override the defaults with `TSC_STACK_SIZE` and
`TSC_MAX_OLD_SPACE`.

Both flags also work from a `tsconfig.json`:

```json
{ "compilerOptions": { "noEmit": true, "noRecursionLimits": true, "printType": "Result" } }
```

## UnboundedTypescript
Is a fork of typescript that adds two flags:

### `--noRecursionLimits`
Removes the limits the checker uses to stop runaway type instantiation, letting your types recurse
as deep as your machine allows instead of erroring out with *"Type instantiation is excessively deep
and possibly infinite"*. Specifically, it disables:

- the 1000-iteration cap on tail-recursive conditional types
- the 100-deep / 5M-count instantiation cap
- the 100-deep cap on type relation checking

Everything else — the complexity caps on unions and on relation caching — is left alone, so a type
that explodes sideways rather than downwards can still be rejected as too complex. (For now...)

### `--printType <name>`
Resolves the type alias with that name in the file you passed and prints it fully expanded
(no `...` truncation, and the alias body rather than the alias name).

It only searches the root files, so a `Result` in your solution wins over a `Result` in a file it
imports. It also skips the whole-program type check: checking every expression re-runs the entire
type-level computation, and with `--noRecursionLimits` that is unbounded — a program whose `Result`
resolves in a second can burn through 12GB of heap during a full check. Syntax errors, option
errors, and anything the checker complains about while resolving the alias are still reported; type
errors elsewhere in the file are not. Drop `--printType` for a normal full check.
