import {
  ToPeano,
  Peano,
  Succ,
  Zero,
  ToNumber,
} from "../hacker-rank/sum-of-odd-elements/peano_numbers";

// ================================================
// Zipper + Tape
// ================================================
type Zipper<P extends any[] = any[], C extends any = any, N extends any[] = any[]> = {
  prev: P;
  curr: C;
  next: N;
};

type Tape<P extends Peano[] = Peano[], C extends Peano = Peano, N extends Peano[] = Peano[]> 
  = Zipper<P, C, N>

type PeekZipper<T extends Zipper> =
  T extends Zipper<any, infer C, any> ? C : null;
type PeekPrev<T extends Zipper> =
  T extends Zipper<[...any[], infer Last], any, any> ? Last : null;

type EmptyTape = { prev: []; curr: ToPeano<0>; next: [] };

// Advances the tape
// inserts a Z if there are no values forward -- this is what makes the tape
// infinite. Defaults to Zero for tapes; the instruction zipper passes `false`.
type Advance<T extends Zipper, Z = Zero> =
  T extends Zipper<infer P, infer C, [infer H, ...infer Rest]>
    ? Zipper<[...P, C], H, Rest>
    : T extends Zipper<infer P, infer C, []>
      ? Zipper<[...P, C], Z, []>
      : never;

// Rewinds the tape
// fails if the tape reaches the end
type Rewind<T extends Zipper> =
  T extends Zipper<[...infer Rest, infer Last], infer C, infer N>
    ? Zipper<Rest, Last, [C, ...N]>
    : never;

type Inc<T extends Tape> =
  T extends Tape<infer P, infer C, infer N>
    ? Zipper<
        P, 
        Succ<C> extends ToPeano<256> ? Zero : Succ<C>, // `add 1, mod 256`
        N
      >
    : never;

type Dec<T extends Tape> =
  T extends Tape<infer P, Succ<infer CMinus1>, infer N>
    ? Zipper<P, CMinus1, N>
    : T extends Tape<infer P, Zero, infer N>
      ? Zipper<P, ToPeano<255>, N> // `subtract 1, mod 256` - the mirror of Inc's wrap
      : never; // unreachable: a cell is either Zero or a Succ

type Write<T extends Tape, V extends Peano> =
  T extends Tape<infer P, any, infer N> ? Tape<P, V, N> : never; //unreachable

type ListToZipper<L extends any[]> = L extends [infer H, ...infer Rest]
  ? { prev: []; curr: H; next: Rest }
  : never;

// ================================================
// Instructions
// ================================================
type Op = string | false
type Instructions<
  P extends Op[] = Op[],
  C extends Op = Op,
  N extends Op[] = Op[]> = Zipper<P, C, N>

// ================================================
// VM State + Instruction handlers
// ================================================
type State<
  TTape extends Tape = Tape,
  TCode extends Instructions = Instructions,
  TStdin extends Peano[] = Peano[],
  TStdout extends Peano[] = Peano[]
> = { tape: TTape; code: TCode; stdin: TStdin; stdout: TStdout };

type ExecAdvance<S extends State> =
  S extends State<infer Tape, infer TCode, infer TStdin, infer TStdout>
    ? State<Advance<Tape, Zero>, Advance<TCode, false>, TStdin, TStdout>
    : never;

type ExecRewind<S extends State> =
  S extends State<infer Tape, infer TCode, infer TStdin, infer TStdout>
    ? State<Rewind<Tape>, Advance<TCode, false>, TStdin, TStdout>
    : never;

type ExecInc<S extends State> =
  S extends State<infer Tape, infer TCode, infer TStdin, infer TStdout>
    ? State<Inc<Tape>, Advance<TCode, false>, TStdin, TStdout>
    : never;

type ExecDec<S extends State> =
  S extends State<infer Tape, infer TCode, infer TStdin, infer TStdout>
    ? State<Dec<Tape>, Advance<TCode, false>, TStdin, TStdout>
    : never;

type ExecPrint<S extends State> =
  S extends State<infer Tape, infer TCode, infer TStdin, infer TStdout>
    ? State<Tape, Advance<TCode, false>, TStdin, [PeekZipper<Tape>, ...TStdout]>
    : never;

type ExecNoop<S extends State> =
  S extends State<infer Tape, infer TCode, infer TStdin, infer TStdout>
    ? State<Tape, Advance<TCode, false>, TStdin, TStdout>
    : never;

type ExecRead<S extends State> =
  S extends State<
    infer Tape,
    infer TCode,
    [infer Head extends Peano, ...infer StdIn extends Peano[]],
    infer TStdout
  >
    ? State<Write<Tape, Head>, Advance<TCode, false>, StdIn, TStdout>
    : never;

type SkipForward<Code extends Instructions, Depth extends Peano = Succ<Zero>> =
  Depth extends Zero
    ? Code
    : PeekZipper<Code> extends "["
      ? SkipForward<Advance<Code, false>, Succ<Depth>> // deeper
      : PeekZipper<Code> extends "]"
        ? Depth extends Succ<infer Rest>
          ? SkipForward<Advance<Code, false>, Rest> // shallower
          : never
        : PeekZipper<Code> extends false | null // EOF safety
          ? Code
          : SkipForward<Advance<Code, false>, Depth>;

type SkipBackward<Code extends Instructions, Depth extends Peano = Succ<Zero>> =
  Depth extends Zero
    ? Code // Code is now sitting perfectly on `[`
    : PeekPrev<Code> extends "]"
      ? SkipBackward<Rewind<Code>, Succ<Depth>> // deeper
      : PeekPrev<Code> extends "["
        ? Depth extends Succ<infer Rest>
          ? SkipBackward<Rewind<Code>, Rest> // shallower
          : never
        : PeekPrev<Code> extends null // BOF safety
          ? Code
          : SkipBackward<Rewind<Code>, Depth>;

type ExecJZ<S extends State> =
  S extends State<infer Tape, infer Code, infer Stdin, infer Stdout>
    ? PeekZipper<Tape> extends Zero
      // Tape is Zero: skip forward past the matching `]`
      ? State<Tape, SkipForward<Advance<Code, false>>, Stdin, Stdout>
      // Tape is non-Zero: enter the loop normally
      : State<Tape, Advance<Code, false>, Stdin, Stdout> 
    : never;

type ExecJNZ<S extends State> =
  S extends State<infer Tape, infer Code, infer Stdin, infer Stdout>
    ? PeekZipper<Tape> extends Zero
      // Tape is Zero: exit loop normally
      ? State<Tape, Advance<Code, false>, Stdin, Stdout> 
      // Tape is non-Zero: rewind all the way back to the matching `[`
      : State<Tape, SkipBackward<Code>, Stdin, Stdout> 
    : never;

// ================================================
// Eval + RunProgram
// ================================================

type Eval<S extends State> =
  S extends State<any, infer Code, any, any>
    ? PeekZipper<Code> extends "+" ? Eval<ExecInc<S>>
    : PeekZipper<Code> extends "-" ? Eval<ExecDec<S>>
    : PeekZipper<Code> extends "." ? Eval<ExecPrint<S>>
    : PeekZipper<Code> extends "," ? Eval<ExecRead<S>>
    : PeekZipper<Code> extends ">" ? Eval<ExecAdvance<S>>
    : PeekZipper<Code> extends "<" ? Eval<ExecRewind<S>>
    : PeekZipper<Code> extends "[" ? Eval<ExecJZ<S>>
    : PeekZipper<Code> extends "]" ? Eval<ExecJNZ<S>>
	: PeekZipper<Code> extends false ? S //halted
	: PeekZipper<Code> extends null ? S //halted
	: Eval<ExecNoop<S>>
  : never //unreachable

// Builds a program from a string with no stdin
type SimpleProgram<S extends string, T extends Tape = EmptyTape> = {
  code: ListToZipper<ToCharList<S>> extends infer C extends Instructions ? C : Instructions<[], false, []>,
  tape: T,
  stdin: [],
  stdout: []
}

// Evaluates a program and prints its stdout
type RunProgram<S extends string> = Eval<SimpleProgram<S>> extends infer R extends State
  ? FormatStdout<Reverse<R['stdout']>>
  : never;


const helloWorld = "++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++." as const

type HelloWorld = RunProgram<typeof helloWorld>

const primeNumbers = `
++++++++ //upper bound
[
  [>+>+<<-]>>[<<+>>-]<
  --
  [
    +>>[-]<<
    <[>>+>+<<<-]>>>[<<<+>>>-]<
    >+
    [
      <
      [>>>>>+>+<<<<<<-]>>>>>>[<<<<<<+>>>>>>-]<<<<<<
      [
        >[-]<<
        [>>+>+<<<-]>>>[<<<+>>>-]
        <<[>>+>+<<<-]>>>[<<<+>>>-]<
        [<->-]<
        >>>+<<<
        [>>>-<<<[-]]<
        -
      ]
      >>>>>[<<<<<+>>>>>-]
      <[[-]<<<<<[>->+<<-]>>[<<+>>-]+>]<
    ]
    <<<>>>>>>>+<<<<<<<[>>>>>>>-<<<<<<<[-]]
    <--
  ]
  >>>>>>>>>+<[>-<[-]]>
  [
  -<<<<<<<<<<[>>>>>>>>>>+>+<<<<<<<<<<<-]>>>>>>>>>>>[<<<<<<<<<<<+>>>>>>>>>>>-]<
  
  [>>+>+<<<-]>>>[<<<+>>>-]<<+>[<->[>++++++++++<[->-[>+>>]>[+[-<+>]>+>>]<<<<<]>[-]
  ++++++++[<++++++>-]>[<<+>>-]>[<<+>>-]<<]>]<[->>++++++++[<++++++>-]]<[.[-]<]<
  [-]>[-]<
  >++++[<+++++++++++>-]<.
  ------------.
  [-]
  ]
  <<<<<<<<<<-
]
` as const

type PrimeNumbers = RunProgram<typeof primeNumbers>

console.log(null as unknown as PrimeNumbers as comptime)

//=================
// Runtime Compiler
//=================

// export function runBf<T extends string>(program: T): RunProgram<T> {
//   const i = ""
//   const b = program
//   var p, k, m, c, o;
//
//   // code golfed bf interpreter from https://codegolf.stackexchange.com/a/231435
//   // @ts-ignore
//   return eval(`m=Array(3e4).fill(k=p=0);o='';${[...b].map(c=>'m[p]=m[p]+1&255@m[p]=m[p]-1&255@p++@p--@while(m[p]){@}@m[p]=i.charCodeAt(k++)|0@o+=String.fromCharCode(m[p])'.split`@`['+-><[],.'.indexOf(c)]).join`;`};o`)
// }
//
// // console.log(runBf(primeNumbers))
// console.log(runBf(primeNumbers) as comptime)


// ==================================================
// Utilities
// ==================================================

type AsciiTable = {
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

type ToCharList<S extends string, Acc extends string[] = []> = 
  S extends `${infer H}${infer Rest}`
    ? ToCharList<Rest, [...Acc, H]>
    : Acc;

type PeanoToChar<P extends Peano> = ToNumber<P> extends infer N extends keyof AsciiTable
  ? AsciiTable[N]
  : "<UNSUPPORTED_CHAR>"; // Fallback for unsupported or unprintable characters

type FormatStdout<T extends Peano[], Acc extends string = ""> =
  T extends [infer H extends Peano, ...infer Rest extends Peano[]]
    ? FormatStdout<Rest, `${Acc}${PeanoToChar<H>}`>
    : Acc;

type Reverse<T extends any[], Acc extends any[] = []> =
  T extends [infer Head, ...infer Rest] ? Reverse<Rest, [Head, ...Acc]> : Acc;
