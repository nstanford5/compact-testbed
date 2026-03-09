import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum BoardState { UNSET = 0, SET = 1 }

export enum ShotState { MISS = 0, HIT = 1 }

export enum TurnState { PLAYER_1_SHOOT = 0,
                        PLAYER_1_CHECK = 1,
                        PLAYER_2_SHOOT = 2,
                        PLAYER_2_CHECK = 3
}

export enum WinState { CONTINUE_PLAY = 0, PLAYER_1_WINS = 1, PLAYER_2_WINS = 2 }

export type Witnesses<PS> = {
  setBoard(context: __compactRuntime.WitnessContext<Ledger, PS>,
           _x1_0: bigint,
           _x2_0: bigint): [PS, BoardState];
  checkBoard(context: __compactRuntime.WitnessContext<Ledger, PS>, x_0: bigint): [PS, ShotState];
}

export type ImpureCircuits<PS> = {
  acceptGame(context: __compactRuntime.CircuitContext<PS>,
             _x1_0: bigint,
             _x2_0: bigint,
             _sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  player1Shoot(context: __compactRuntime.CircuitContext<PS>,
               x_0: bigint,
               _sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  player2Shoot(context: __compactRuntime.CircuitContext<PS>,
               x_0: bigint,
               _sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  checkBoard1(context: __compactRuntime.CircuitContext<PS>, _sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, WinState>;
  checkBoard2(context: __compactRuntime.CircuitContext<PS>, _sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, WinState>;
}

export type PureCircuits = {
  publicKey(_sk_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  acceptGame(context: __compactRuntime.CircuitContext<PS>,
             _x1_0: bigint,
             _x2_0: bigint,
             _sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  player1Shoot(context: __compactRuntime.CircuitContext<PS>,
               x_0: bigint,
               _sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  player2Shoot(context: __compactRuntime.CircuitContext<PS>,
               x_0: bigint,
               _sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  checkBoard1(context: __compactRuntime.CircuitContext<PS>, _sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, WinState>;
  checkBoard2(context: __compactRuntime.CircuitContext<PS>, _sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, WinState>;
  publicKey(context: __compactRuntime.CircuitContext<PS>, _sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  readonly player1: Uint8Array;
  readonly player2: Uint8Array;
  readonly turn: TurnState;
  board1: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  board2: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly board1State: BoardState;
  readonly board2State: BoardState;
  player1Shot: {
    isEmpty(): boolean;
    length(): bigint;
    head(): { is_some: boolean, value: bigint };
    [Symbol.iterator](): Iterator<bigint>
  };
  player2Shot: {
    isEmpty(): boolean;
    length(): bigint;
    head(): { is_some: boolean, value: bigint };
    [Symbol.iterator](): Iterator<bigint>
  };
  board1Hits: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: bigint): boolean;
    [Symbol.iterator](): Iterator<bigint>
  };
  board2Hits: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: bigint): boolean;
    [Symbol.iterator](): Iterator<bigint>
  };
  readonly winState: WinState;
  readonly board1HitCount: bigint;
  readonly board2HitCount: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               _x1_0: bigint,
               _x2_0: bigint,
               _sk_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
