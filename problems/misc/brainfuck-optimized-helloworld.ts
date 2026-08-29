// ============================================================================
// A brainfuck interpreter capable of running hello world runs under stock tsc limits.
//
//   ./bin/tsc --noEmit --printType Result ./problems/misc/brainfuck2.ts
//   # "Hello World!\n"
//
// MEASURED (Hello World, no --noRecursionLimits, default 8GB heap):
//
//   wall              0.44 s          (0.43-0.45 over three runs)
//   peak RSS          372 MiB         (390 MB)
//   tsc "Memory used" 185 MiB
//   instantiations    158,805
//   types             47,872
//   steps executed    906             (~175 instantiations/step incl. ~32k setup)
//   errors            0   (also clean under a plain full check: tsc --noEmit)
//
// problems/misc/brainfuck.ts cannot run Hello World with
// stock limits. It fails with
//
//   TS2321: Excessive stack depth comparing types 'Succ<Succ<Succ<...

//builds a list of numbers
// [0, 1, ..., N]
type BuildRange<N extends number, Acc extends number[] = []> =
  0 extends 1 ? never : // <- hack to bypass tail-recusion limit (depends on a compiler bug that may change in the future)
  Acc["length"] extends N ? Acc : BuildRange<N, [...Acc, Acc["length"]]>;

// [0, ... 256]
type Range256 = BuildRange<256>;

// [1, 2, ..., 255, 0] — rotate left, so Succ256[n] == (n + 1) % 256
type Succ256 = Range256 extends [infer F extends number, ...infer R extends number[]]
  ? [...R, F]
  : never;

// [255, 0, 1, ..., 254] — rotate right, so Pred256[n] == (n + 255) % 256
type Pred256 = Range256 extends [...infer R extends number[], infer L extends number]
  ? [L, ...R]
  : never;

// Inc and Dec are mod256 and are O(1)
type Inc<N extends number> = Succ256[N];
type Dec<N extends number> = Pred256[N];

// =================================
// TAPE
// =================================
type Zeros<N extends number, Acc extends number[] = []> =
  0 extends 1 ? never :
  Acc["length"] extends N ? Acc : Zeros<N, [...Acc, 0]>;

type EmptyTape = Zeros<32>;

// Expensive! Walk to index P accumulating the prefix, then splice: [...prefix, V, ...suffix].
type SetAt<T extends number[], P extends number, V extends number, Acc extends number[] = []> =
  0 extends 1 ? never :
  Acc["length"] extends P
    ? T extends [any, ...infer Rest extends number[]] ? [...Acc, V, ...Rest] : never
    : T extends [infer H extends number, ...infer Rest extends number[]]
      ? SetAt<Rest, P, V, [...Acc, H]>
      : never;

// ============================================================================
// PARSER
//
// The source is turned into a Tree once, before execution. 
// This is the most important change, we can get rid of comments
// and loops become subtrees that are cheap to iterate.
// ============================================================================
type Prim = "+" | "-" | "<" | ">" | "." | ",";
type Node = Prim | { loop: unknown[] };

type Parse<
  S extends string,
  Cur extends Node[] = [],
  Stack extends Node[][] = []
> =
  0 extends 1 ? never :
  S extends `${infer H}${infer R}`
    ? H extends "["
      // descend: push the sequence built so far, start a fresh one for the body
      ? Parse<R, [], [Cur, ...Stack]>
      : H extends "]"
        // ascend: wrap the body as a node and append it to the parent sequence
        ? Stack extends [infer Top extends Node[], ...infer Rest extends Node[][]]
          ? Parse<R, [...Top, { loop: Cur }], Rest>
          : never // unbalanced `]`
        : H extends Prim
          ? Parse<R, [...Cur, H], Stack>
          : Parse<R, Cur, Stack> // comments and whitespace are dropped at parse time
    : Cur;

// ----------------------------------------------------------------------------
// EVALUATOR
//
// State is [tape, pointer, stdout], read POSITIONALLY (`S[0]`, `S[1]`, `S[2]`)
// rather than destructured with `S extends State<infer A, infer B, infer C>`.
// ----------------------------------------------------------------------------
type St = [number[], number, string];

// One primitive instruction. Ordered roughly by how often each appears.
type Step<N, S extends St> =
  N extends "+" ? [SetAt<S[0], S[1], Inc<S[0][S[1]]>>, S[1], S[2]]
  : N extends "-" ? [SetAt<S[0], S[1], Dec<S[0][S[1]]>>, S[1], S[2]]
  : N extends ">" ? [S[0], Inc<S[1]>, S[2]]
  : N extends "<" ? [S[0], Dec<S[1]>, S[2]]
  : N extends "." ? [S[0], S[1], `${S[2]}${ToChar<S[0][S[1]]>}`]
  : N extends "," ? [SetAt<S[0], S[1], 0>, S[1], S[2]] // no stdin: reads as 0
  : S;

// Run a sequence of nodes left to right, threading state through. Tail-recursive:
type RunSeq<Ns extends unknown[], S extends St> =
  0 extends 1 ? never :
  Ns extends [infer H, ...infer R]
    ? RunSeq<R, H extends { loop: infer B extends unknown[] } ? RunLoop<B, S> : Step<H, S>>
    : S;

// `[body]` — run the body while the current cell is non-zero. Also tail-recursive, so repetition is a loop
type RunLoop<B extends unknown[], S extends St> =
  0 extends 1 ? never :
  S[0][S[1]] extends 0 ? S : RunLoop<B, RunSeq<B, S>>;

// Parse, then run from a zeroed tape, and project out stdout.
type Run<Src extends string> = RunSeq<Parse<Src>, [EmptyTape, 0, ""]>[2];

// ----------------------------------------------------------------------------
// Programs
// ----------------------------------------------------------------------------
const helloWorld =
  "++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++." as const;

export type Result = Run<typeof helloWorld>;

// ----------------------------------------------------------------------------
// Utilities
// ----------------------------------------------------------------------------

type ToChar<N> = N extends keyof Ascii ? Ascii[N] : "<UNSUPPORTED_CHAR>";

type Ascii = {
  10: "\n";
  32: " "; 33: "!"; 34: "\""; 35: "#"; 36: "$"; 37: "%"; 38: "&"; 39: "'";
  40: "("; 41: ")"; 42: "*"; 43: "+"; 44: ","; 45: "-"; 46: "."; 47: "/";
  48: "0"; 49: "1"; 50: "2"; 51: "3"; 52: "4"; 53: "5"; 54: "6"; 55: "7";
  56: "8"; 57: "9"; 58: ":"; 59: ";"; 60: "<"; 61: "="; 62: ">"; 63: "?";
  64: "@"; 65: "A"; 66: "B"; 67: "C"; 68: "D"; 69: "E"; 70: "F"; 71: "G";
  72: "H"; 73: "I"; 74: "J"; 75: "K"; 76: "L"; 77: "M"; 78: "N"; 79: "O";
  80: "P"; 81: "Q"; 82: "R"; 83: "S"; 84: "T"; 85: "U"; 86: "V"; 87: "W";
  88: "X"; 89: "Y"; 90: "Z"; 91: "["; 92: "\\"; 93: "]"; 94: "^"; 95: "_";
  96: "`"; 97: "a"; 98: "b"; 99: "c"; 100: "d"; 101: "e"; 102: "f"; 103: "g";
  104: "h"; 105: "i"; 106: "j"; 107: "k"; 108: "l"; 109: "m"; 110: "n"; 111: "o";
  112: "p"; 113: "q"; 114: "r"; 115: "s"; 116: "t"; 117: "u"; 118: "v"; 119: "w";
  120: "x"; 121: "y"; 122: "z"; 123: "{"; 124: "|"; 125: "}"; 126: "~";
};
