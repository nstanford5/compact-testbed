import { Ledger, WinnerState } from './managed/hidden-num-raffle/contract/index.js';
import { WitnessContext } from '@midnight-ntwrk/compact-runtime';

export type RafflePrivateState = {
    winState: number,
    sk: Uint8Array
}

export const createRafflePrivateState = (winState: number, sk: Uint8Array) => ({
    winState,
    sk
});

export const witnesses = {};