#!/usr/bin/env zsh
# Compile and run brainfuck.ts both ways, to see where the work happens.
#
#   with --comptime     the typechecker runs the brainfuck program and the result is
#                       emitted as a string literal, so node has nothing left to do
#   without --comptime  the assertion is erased like any other, so the JS interpreter
#                       runs the program at runtime instead
#
# Timings come from `command time -l` (/usr/bin/time, not the shell keyword). Step 4 is
# deliberately untimed.
set -e

TIMEFMT='%mE'

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
TSC="$ROOT/bin/tsc"
SRC="$ROOT/problems/misc/brainfuck.ts"
OUT_COMPTIME="$ROOT/dist/comptime"
OUT_RUNTIME="$ROOT/dist/no-comptime"

if [ ! -f "$TSC" ]; then
  echo "UnboundedTypeScript is not built. Run ./scripts/init-repo.sh" >&2
  exit 1
fi

rm -rf "$OUT_COMPTIME" "$OUT_RUNTIME"

echo "==> 1. compile with --comptime (the typechecker runs brainfuck)"
command time -l "$TSC" --noRecursionLimits --comptime \
  --rootDir "$ROOT/problems" --outDir "$OUT_COMPTIME" "$SRC"

echo
echo "==> 2. run it (the output is already baked in as a literal)"
command time -l node "$OUT_COMPTIME/misc/brainfuck.js"

echo
echo "==> 3. compile without --comptime (the assertion is just erased)"
command time -l "$TSC" --noRecursionLimits --noCheck \
  --rootDir "$ROOT/problems" --outDir "$OUT_RUNTIME" "$SRC"

echo
echo "==> 4. run it (brainfuck runs now, in node)"
command time -l node "$OUT_RUNTIME/misc/brainfuck.js"
