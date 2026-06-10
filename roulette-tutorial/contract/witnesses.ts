import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import type { Ledger as RouletteLedger } from './managed/roulette/contract/index.js';
import type { Ledger as ChipsLedger } from './managed/chips/contract/index.js';

// Both the roulette and chips contracts declare the same
// `witness localSecretKey(): Bytes<32>` function and share an identity
// derivation, so a single private-state shape and witness object backs
// them both.
export type RoulettePrivateState = {
    sk: Uint8Array;
};

export const createRoulettePrivateState = (sk: Uint8Array): RoulettePrivateState => ({
    sk,
});

export const rouletteWitnesses = {
    localSecretKey: ({
        privateState,
    }: WitnessContext<RouletteLedger, RoulettePrivateState>): [
        RoulettePrivateState,
        Uint8Array,
    ] => {
        return [privateState, privateState.sk];
    },
};

export const chipsWitnesses = {
    localSecretKey: ({
        privateState,
    }: WitnessContext<ChipsLedger, RoulettePrivateState>): [
        RoulettePrivateState,
        Uint8Array,
    ] => {
        return [privateState, privateState.sk];
    },
};
