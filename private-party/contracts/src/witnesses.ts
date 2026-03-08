// This file defines the shape of the private state,
// as well as the witness function(s)

import { Ledger, PartyState } from './managed/private-party/contract/index.js';
import { WitnessContext } from '@midnight-ntwrk/compact-runtime';

// we need to define a type for the private state
export type PartyPrivateState = {
    partyState: number;
}

// create a function for making an object of the custom PrivatePartyState type
export const createPartyPrivateState = (partyState: number) => ({
    partyState,
});


export const witnesses = {
  startParty: ({
    privateState
  }: WitnessContext<Ledger, PartyPrivateState>): [
    PartyPrivateState,
    number
    // return 1 to start the party
  ] => [privateState, PartyState.READY],
};

