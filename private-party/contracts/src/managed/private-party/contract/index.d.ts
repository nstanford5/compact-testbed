import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum PartyState { NOT_READY = 0, READY = 1 }

export type Witnesses<PS> = {
  startParty(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, PartyState];
}

export type ImpureCircuits<PS> = {
  addOrganizer(context: __compactRuntime.CircuitContext<PS>,
               newOrganizerPk_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  addParticipant(context: __compactRuntime.CircuitContext<PS>,
                 _participantPk_0: Uint8Array,
                 _organizerSk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  checkIn(context: __compactRuntime.CircuitContext<PS>,
          participantPk_0: Uint8Array,
          _organizerSk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  chainStartParty(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  publicKey(_sk_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  addOrganizer(context: __compactRuntime.CircuitContext<PS>,
               newOrganizerPk_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  addParticipant(context: __compactRuntime.CircuitContext<PS>,
                 _participantPk_0: Uint8Array,
                 _organizerSk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  checkIn(context: __compactRuntime.CircuitContext<PS>,
          participantPk_0: Uint8Array,
          _organizerSk_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  chainStartParty(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  publicKey(context: __compactRuntime.CircuitContext<PS>, _sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  organizers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: { bytes: Uint8Array }): boolean;
    [Symbol.iterator](): Iterator<{ bytes: Uint8Array }>
  };
  hashedPartyGoers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  checkedInParty: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly partyState: PartyState;
  readonly partiers: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
