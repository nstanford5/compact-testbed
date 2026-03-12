import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum WinnerState { UNSET = 0, SET = 1 }

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  getTicket(context: __compactRuntime.CircuitContext<PS>, _sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revealWinner(context: __compactRuntime.CircuitContext<PS>,
               winningNum_0: bigint,
               sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  claimWin(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  publicKey(sk_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  getTicket(context: __compactRuntime.CircuitContext<PS>, _sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revealWinner(context: __compactRuntime.CircuitContext<PS>,
               winningNum_0: bigint,
               sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  claimWin(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  publicKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  readonly raffleOrganizer: Uint8Array;
  readonly hashedWinningNum: Uint8Array;
  readonly publicWinningNum: bigint;
  readonly winner: Uint8Array;
  readonly state: WinnerState;
  readonly assignedNumbers: bigint;
  assignedTicketHolders: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               winningNum_0: bigint,
               _sk_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
