import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum BetState { CLOSED = 0, OPEN = 1 }

export enum Color { GREEN = 0, RED = 1, BLACK = 2 }

export enum Thirds { FIRST = 0, SECOND = 1, THIRD = 2 }

export enum EvenOdd { EVEN = 0, ODD = 1 }

export enum BigSmall { SMALL = 0, BIG = 1 }

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  betColor(context: __compactRuntime.CircuitContext<PS>,
           betAmount_0: bigint,
           colorBet_0: Color): __compactRuntime.CircuitResults<PS, []>;
  betThirds(context: __compactRuntime.CircuitContext<PS>,
            betAmount_0: bigint,
            thirdBet_0: Thirds): __compactRuntime.CircuitResults<PS, []>;
  betEvenOdd(context: __compactRuntime.CircuitContext<PS>,
             betAmount_0: bigint,
             betEvenOdd_0: EvenOdd): __compactRuntime.CircuitResults<PS, []>;
  betBigSmall(context: __compactRuntime.CircuitContext<PS>,
              betAmount_0: bigint,
              betBigSmall_0: BigSmall): __compactRuntime.CircuitResults<PS, []>;
  betNumber(context: __compactRuntime.CircuitContext<PS>,
            betAmount_0: bigint,
            number_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  revealWinningNumber(context: __compactRuntime.CircuitContext<PS>,
                      winningNum_0: bigint,
                      _sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  claimWin(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  betColor(context: __compactRuntime.CircuitContext<PS>,
           betAmount_0: bigint,
           colorBet_0: Color): __compactRuntime.CircuitResults<PS, []>;
  betThirds(context: __compactRuntime.CircuitContext<PS>,
            betAmount_0: bigint,
            thirdBet_0: Thirds): __compactRuntime.CircuitResults<PS, []>;
  betEvenOdd(context: __compactRuntime.CircuitContext<PS>,
             betAmount_0: bigint,
             betEvenOdd_0: EvenOdd): __compactRuntime.CircuitResults<PS, []>;
  betBigSmall(context: __compactRuntime.CircuitContext<PS>,
              betAmount_0: bigint,
              betBigSmall_0: BigSmall): __compactRuntime.CircuitResults<PS, []>;
  betNumber(context: __compactRuntime.CircuitContext<PS>,
            betAmount_0: bigint,
            number_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  revealWinningNumber(context: __compactRuntime.CircuitContext<PS>,
                      winningNum_0: bigint,
                      _sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  claimWin(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly theHouse: { bytes: Uint8Array };
  readonly maxBet: bigint;
  readonly maxBetCount: bigint;
  readonly winningNumHash: Uint8Array;
  readonly winningNumPublic: bigint;
  readonly betState: BetState;
  numberBets: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: { bytes: Uint8Array }): boolean;
    lookup(key_0: { bytes: Uint8Array }): bigint;
    [Symbol.iterator](): Iterator<[{ bytes: Uint8Array }, bigint]>
  };
  numberBetAmounts: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: { bytes: Uint8Array }): boolean;
    lookup(key_0: { bytes: Uint8Array }): bigint;
    [Symbol.iterator](): Iterator<[{ bytes: Uint8Array }, bigint]>
  };
  colorBets: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: { bytes: Uint8Array }): boolean;
    lookup(key_0: { bytes: Uint8Array }): Color;
    [Symbol.iterator](): Iterator<[{ bytes: Uint8Array }, Color]>
  };
  colorBetAmounts: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: { bytes: Uint8Array }): boolean;
    lookup(key_0: { bytes: Uint8Array }): bigint;
    [Symbol.iterator](): Iterator<[{ bytes: Uint8Array }, bigint]>
  };
  thirdBets: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: { bytes: Uint8Array }): boolean;
    lookup(key_0: { bytes: Uint8Array }): Thirds;
    [Symbol.iterator](): Iterator<[{ bytes: Uint8Array }, Thirds]>
  };
  thirdBetAmounts: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: { bytes: Uint8Array }): boolean;
    lookup(key_0: { bytes: Uint8Array }): bigint;
    [Symbol.iterator](): Iterator<[{ bytes: Uint8Array }, bigint]>
  };
  evenOddBets: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: { bytes: Uint8Array }): boolean;
    lookup(key_0: { bytes: Uint8Array }): EvenOdd;
    [Symbol.iterator](): Iterator<[{ bytes: Uint8Array }, EvenOdd]>
  };
  evenOddBetAmounts: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: { bytes: Uint8Array }): boolean;
    lookup(key_0: { bytes: Uint8Array }): bigint;
    [Symbol.iterator](): Iterator<[{ bytes: Uint8Array }, bigint]>
  };
  bigSmallBets: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: { bytes: Uint8Array }): boolean;
    lookup(key_0: { bytes: Uint8Array }): BigSmall;
    [Symbol.iterator](): Iterator<[{ bytes: Uint8Array }, BigSmall]>
  };
  bigSmallBetAmounts: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: { bytes: Uint8Array }): boolean;
    lookup(key_0: { bytes: Uint8Array }): bigint;
    [Symbol.iterator](): Iterator<[{ bytes: Uint8Array }, bigint]>
  };
  winnerList: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: { bytes: Uint8Array }): boolean;
    lookup(key_0: { bytes: Uint8Array }): bigint;
    [Symbol.iterator](): Iterator<[{ bytes: Uint8Array }, bigint]>
  };
  readonly color: Color;
  readonly third: Thirds;
  readonly evenOdd: EvenOdd;
  readonly betCount: bigint;
  readonly bigSmall: BigSmall;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               setMaxBet_0: bigint,
               setMaxBetCount_0: bigint,
               _winningNum_0: bigint,
               _sk_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
