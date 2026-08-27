// ============================================================================
// Solution by representing numbers as peano numbers
// ============================================================================
import { Case1 } from "./test_cases";

export type Zero = { readonly tag: 'Zero' };
export type Succ<N extends Peano> = { readonly tag: 'Succ'; readonly prev: N };
export type Peano = Zero | Succ<any>;

type IsAny<T> = 0 extends (1 & T) ? true : false;

export type Add<A extends Peano, B extends Peano> = IsAny<A> extends true ? never
  : A extends Zero ? B
  : A extends Succ<infer PrevA> ? Add<PrevA, Succ<B>> : never;

type ParseInt<S extends string> = S extends `${infer N extends number}` ? N : never;

export type ToPeano<N extends number, Acc extends Peano = Zero, C extends unknown[] = []> = 
  N extends number ?
    C['length'] extends N 
      ? Acc 
      : ToPeano<N, Succ<Acc>, [unknown, ...C]>
  : never

type ParseToPeano<S extends string> = ToPeano<ParseInt<S>>;

type IsOdd<N extends Peano> = N extends Zero 
  ? false
  : N extends Succ<infer P1> 
    ? P1 extends Zero 
      ? true 
      : P1 extends Succ<infer P2> 
        ? IsOdd<P2> 
        : never 
    : never;

type KeepOdd<N extends Peano> = IsOdd<N> extends true ? N : Zero;

type MapToPeano<T extends string[]> = T extends [infer H extends string, ...infer Rest extends string[]]
  ? [ParseToPeano<H>, ...MapToPeano<Rest>]
  : [];

type OddInput<T extends Peano[], Acc extends Peano[] = []> = T extends [infer H extends Peano, ...infer Rest extends Peano[]]
  ? OddInput<Rest, [KeepOdd<H>, ...Acc]>
  : [];

type Sum<T extends Peano[], Acc extends Peano = Zero> = 
  T extends [infer H extends Peano, ...infer Rest extends Peano[]] 
  ? Sum<Rest, Add<H, Acc>>
  : Acc;

export type ToNumber<N extends Peano, C extends unknown[] = []> = 
  IsAny<N> extends true 
    ? never 
    : N extends Zero 
      ? C['length'] 
      : N extends Succ<infer Prev>
        ? ToNumber<Prev, [unknown, ...C]>
        : never;


type Parsed = MapToPeano<Case1>;
type Filtered = OddInput<Parsed>;
type PeanoResult = Sum<Filtered>;

export type Result = ToNumber<PeanoResult>;
