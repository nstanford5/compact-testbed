// This file defines the shape of the private state,
// as well as the witness function(s)

import { Ledger, BoardState, ShotState } from './managed/battleship-simple/contract/index.js';
import { WitnessContext } from '@midnight-ntwrk/compact-runtime';

// we need to define a type for the private state
// this is first exposure to Compact -> TS type mappings
export type BattlePrivateState = {
    x1: bigint,
    x2: bigint,
    boardState: number,
    shotState: number
};

// create a function for making an object of the custom PrivatePartyState type
export const createBattlePrivateState = (x1: bigint, x2: bigint, boardState: number, shotState: number) => ({
    x1,
    x2,
    boardState,
    shotState
});

// do I need this?
export const createBoardState = (boardState: number) => ({
    boardState
});

export const witnesses = {
    setBoard: ({
        privateState
    }: WitnessContext<Ledger, BattlePrivateState>, x1: bigint, x2: bigint): [
        BattlePrivateState,
        BoardState
    ] => {
        privateState.x1 = x1;
        privateState.x2 = x2;
        return [privateState, BoardState.SET]
    },// end of setBoard
    checkBoard: ({
        privateState
        // parameter input types
    }: WitnessContext<Ledger, BattlePrivateState>, x: bigint): [
        // return types
        BattlePrivateState,
        ShotState
    ] => {
        // checkBoard function impl (frontend)
        let currentShot: ShotState = ShotState.MISS;

        if(x == privateState.x1 || x == privateState.x2){
            currentShot = ShotState.HIT;
        }
        return [privateState, currentShot];
    },// end of checkBoard
};
