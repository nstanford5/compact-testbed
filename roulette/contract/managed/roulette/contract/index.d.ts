import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum BetState { CLOSED = 0, OPEN = 1 }

export enum Color { GREEN = 0, RED = 1, BLACK = 2 }

export enum Thirds { FIRST = 0, SECOND = 1, THIRD = 2 }

export enum EvenOdd { EVEN = 0, ODD = 1 }

export enum BigSmall { SMALL = 0, BIG = 1 }

export type Witnesses<PS> = {
  localSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  betColor(context: __compactRuntime.CircuitContext<PS>,
           coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
           colorBet_0: Color): __compactRuntime.CircuitResults<PS, []>;
  betThirds(context: __compactRuntime.CircuitContext<PS>,
            coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
            thirdBet_0: Thirds): __compactRuntime.CircuitResults<PS, []>;
  betEvenOdd(context: __compactRuntime.CircuitContext<PS>,
             coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
             betEvenOdd_0: EvenOdd): __compactRuntime.CircuitResults<PS, []>;
  betBigSmall(context: __compactRuntime.CircuitContext<PS>,
              coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
              betBigSmall_0: BigSmall): __compactRuntime.CircuitResults<PS, []>;
  betNumber(context: __compactRuntime.CircuitContext<PS>,
            coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
            number_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  revealWinningNumber(context: __compactRuntime.CircuitContext<PS>,
                      winningNum_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  claimWin(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  betColor(context: __compactRuntime.CircuitContext<PS>,
           coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
           colorBet_0: Color): __compactRuntime.CircuitResults<PS, []>;
  betThirds(context: __compactRuntime.CircuitContext<PS>,
            coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
            thirdBet_0: Thirds): __compactRuntime.CircuitResults<PS, []>;
  betEvenOdd(context: __compactRuntime.CircuitContext<PS>,
             coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
             betEvenOdd_0: EvenOdd): __compactRuntime.CircuitResults<PS, []>;
  betBigSmall(context: __compactRuntime.CircuitContext<PS>,
              coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
              betBigSmall_0: BigSmall): __compactRuntime.CircuitResults<PS, []>;
  betNumber(context: __compactRuntime.CircuitContext<PS>,
            coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
            number_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  revealWinningNumber(context: __compactRuntime.CircuitContext<PS>,
                      winningNum_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  claimWin(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  betColor(context: __compactRuntime.CircuitContext<PS>,
           coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
           colorBet_0: Color): __compactRuntime.CircuitResults<PS, []>;
  betThirds(context: __compactRuntime.CircuitContext<PS>,
            coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
            thirdBet_0: Thirds): __compactRuntime.CircuitResults<PS, []>;
  betEvenOdd(context: __compactRuntime.CircuitContext<PS>,
             coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
             betEvenOdd_0: EvenOdd): __compactRuntime.CircuitResults<PS, []>;
  betBigSmall(context: __compactRuntime.CircuitContext<PS>,
              coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
              betBigSmall_0: BigSmall): __compactRuntime.CircuitResults<PS, []>;
  betNumber(context: __compactRuntime.CircuitContext<PS>,
            coin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
            number_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  revealWinningNumber(context: __compactRuntime.CircuitContext<PS>,
                      winningNum_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  claimWin(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly theHouse: Uint8Array;
  readonly chipColor: Uint8Array;
  readonly maxBetCount: bigint;
  readonly winningNumHash: Uint8Array;
  readonly winningNumPublic: bigint;
  readonly betState: BetState;
  numberBets: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  colorBets: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Color;
    [Symbol.iterator](): Iterator<[Uint8Array, Color]>
  };
  thirdBets: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Thirds;
    [Symbol.iterator](): Iterator<[Uint8Array, Thirds]>
  };
  evenOddBets: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): EvenOdd;
    [Symbol.iterator](): Iterator<[Uint8Array, EvenOdd]>
  };
  bigSmallBets: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): BigSmall;
    [Symbol.iterator](): Iterator<[Uint8Array, BigSmall]>
  };
  winnerList: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
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
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               setMaxBetCount_0: bigint,
               _winningNum_0: bigint,
               _chipColor_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
