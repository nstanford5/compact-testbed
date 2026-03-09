import { BattleSimulator } from './battle-simulator.js';
import { NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { sampleCoinPublicKey } from '@midnight-ntwrk/ledger-v7';
import { describe, it, expect } from 'vitest';
import { randomBytes, startArgs} from './utils.js';
import { BoardState, WinState, TurnState } from '../managed/battleship-simple/contract/index.js'


setNetworkId('undeployed' as NetworkId);

describe("Battleship simple smart contract", () => {
    it("executes the constructor correctly", () => {
        const [x1, x2, sk] = startArgs(2, 4, randomBytes(32));
        const sim0 = new BattleSimulator(x1, x2, sk);
        const ledgerState = sim0.getLedger();

        expect(ledgerState.board1.size()).toEqual(2n);
        expect(ledgerState.board1State).toEqual(BoardState.SET);
        expect(ledgerState.winState).toEqual(WinState.CONTINUE_PLAY);
    });

    it("forces valid space selection to player1", () => {
        const skBytes = randomBytes(32);

        expect(() => {
            const [x1, x2, sk] = startArgs(0, 5, skBytes);
            const sim0 = new BattleSimulator(x1, x2, sk);
        }).toThrow("No zero index, board starts at 1");

        expect(() => {
            const [x1, x2, sk] = startArgs(2, 0, skBytes);
            const sim0 = new BattleSimulator(x1, x2, sk);
        }).toThrow("No zero index, board starts at 1");

        expect(() => {
            const [x1, x2, sk] = startArgs(2, 2, skBytes);
            const sim0 = new BattleSimulator(x1, x2, sk);
        }).toThrow("Cannot use the same number twice");

        expect(() => {
            const [x1, x2, sk] = startArgs(21, 5, skBytes);
            const sim0 = new BattleSimulator(x1, x2, sk);
        }).toThrow("Out of bounds, please keep ships on the board");

        expect(() => {
            const [x1, x2, sk] = startArgs(8, 30, skBytes);
            const sim0 = new BattleSimulator(x1, x2, sk);
        }).toThrow("Out of bounds, please keep ships on the board");
    });

    it("allows player2 to accept the game", () => {
        const [x1, x2, sk] = startArgs(5, 8, randomBytes(32));
        const sim0 = new BattleSimulator(x1, x2, sk);
        //const testPk = sampleCoinPublicKey();

        const player1Sk = sk;
        const player2Sk = randomBytes(32);
        const player1PubKey = sim0.publicKey(player1Sk);
        const player2PubKey = sim0.publicKey(player2Sk);

        // Question: how does Bob call into Alices contract (best practice)?
        sim0.acceptGame(BigInt(5), BigInt(9), player2Sk);
        const ledgerState = sim0.getLedger();

        expect(ledgerState.player1).toEqual(player1PubKey);
        expect(ledgerState.player2).toEqual(player2PubKey);
        expect(ledgerState.board2.size()).toEqual(2n);
        expect(ledgerState.board2State).toEqual(BoardState.SET);
        expect(ledgerState.turn).toEqual(TurnState.PLAYER_1_SHOOT);
    });

    it("allows player 1 to take the first shot", () => {
        const [x1, x2, sk] = startArgs(11, 18, randomBytes(32));
        const sim0 = new BattleSimulator(x1, x2, sk);
        const p1Sk = sk;
        const p2Sk = randomBytes(32);
        const p1PubKey = sim0.publicKey(p1Sk);
        const p2PubKey = sim0.publicKey(p2Sk);
        sim0.acceptGame(BigInt(4), BigInt(13), p2Sk);
        const ledgerState = sim0.getLedger();
        expect(ledgerState.turn).toEqual(TurnState.PLAYER_1_SHOOT);

        const p1Shot = BigInt(9);
        sim0.player1Shoot(p1Shot, p1Sk);
        const newLedgerState = sim0.getLedger();
        expect(newLedgerState.player1Shot.isEmpty()).toBeFalsy();
        expect(newLedgerState.player1Shot.head().value).toEqual(p1Shot);
        expect(newLedgerState.turn).toEqual(TurnState.PLAYER_2_CHECK);
    });

    it("allows player 2 to check their board", () => {
        const [x1, x2, sk] = startArgs(12, 19, randomBytes(32));
        const sim0 = new BattleSimulator(x1, x2, sk);
        const p1Sk = sk;
        const p2Sk = randomBytes(32);
        const p1PubKey = sim0.publicKey(p1Sk);
        const p2PubKey = sim0.publicKey(p2Sk);
        sim0.acceptGame(BigInt(2), BigInt(9), p2Sk);
        const p1Shot = BigInt(16);
        sim0.player1Shoot(p1Shot, p1Sk);
        const ledgerState = sim0.getLedger();
        expect(ledgerState.player1Shot.head().value).toEqual(p1Shot);
        expect(ledgerState.turn).toEqual(TurnState.PLAYER_2_CHECK);

        const winState = sim0.checkBoard2(p2Sk);
        const newLedgerState = sim0.getLedger();
        expect(newLedgerState.winState).toEqual(WinState.CONTINUE_PLAY);
        expect(newLedgerState.board2HitCount).toEqual(0n);
        // fails
        // need to create a private state (in the front end) for each player
        expect(newLedgerState.turn).toEqual(TurnState.PLAYER_2_SHOOT);
        // fails
        //expect(newLedgerState.player1Shot.isEmpty()).toBeTruthy();
    });
})