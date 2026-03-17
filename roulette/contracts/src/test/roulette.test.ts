import { RouletteSimulator, WalletBuilder } from './roulette-simulator.js';
import { NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { describe, it, expect } from 'vitest';
import { BetState, BigSmall, EvenOdd, Thirds, Color } from '../managed/roulette/contract/index.js';
import { encodeCoinPublicKey } from '@midnight-ntwrk/compact-runtime';

setNetworkId('undeployed' as NetworkId);

describe("Roulette Smart Contract", () => {
    it('executes the constructor correctly', () => {
        const sim = new RouletteSimulator(BigInt(1));

        const ledgerState = sim.getLedger();
        expect(ledgerState.betState).toEqual(BetState.OPEN);
    });
    it('forces the winning number on the board', () => {
        expect(() => {
            const sim = new RouletteSimulator(BigInt(37));
        }).toThrow("Cheat Detected: theHouse: Please keep the number on the table");

        // edge tests
        const sim0 = new RouletteSimulator(BigInt(0));
        const sim36 = new RouletteSimulator(BigInt(36));
    });
    it('Allows bets from different players and plays to the end', () => {
        const winningNum = BigInt(10);
        const sim = new RouletteSimulator(winningNum);
        
        const bob = new WalletBuilder(sim.contractAddress, sim.getContractState());

        // update sim context to call as bob
        sim.switchCaller(bob.callerContext);
        sim.betNumber(BigInt(3), BigInt(3));
        const ledgerState = sim.getLedger();
        expect(ledgerState.betCount).toEqual(1n);
        const bobEncoded: Uint8Array = encodeCoinPublicKey(bob.address);
        expect(ledgerState.numberBets.member({bytes: bobEncoded})).toBeTruthy();

        // claire makes a winning bet
        const claire = new WalletBuilder(sim.contractAddress, sim.getContractState());
        sim.switchCaller(claire.callerContext);
        sim.betNumber(BigInt(10), BigInt(10));
        const nextLedgerState = sim.getLedger();
        const claireEncoded: Uint8Array = encodeCoinPublicKey(claire.address);
        expect(nextLedgerState.numberBets.member({bytes: claireEncoded})).toBeTruthy();
        expect(nextLedgerState.betCount).toEqual(2n);
        
        // how do I transition back to Alice and fetch a persistent contractState?
        // this.aliceAddress, sim.getContractState();

        sim.setAliceContext(sim.getContractState());
        // should be calling as Alice now
        expect(() => {
            sim.betNumber(BigInt(20), BigInt(20));
        }).toThrow("Cheat Detected: theHouse: cannot bet on its own number");

        sim.revealWinningNumber(winningNum, sim.aliceSk);
        const finalLedgerState = sim.getLedger();

        expect(finalLedgerState.betState).toEqual(BetState.CLOSED);
        expect(finalLedgerState.winningNumPublic).toEqual(winningNum);
        expect(finalLedgerState.betCount).toEqual(2n);// count persists callers

        // switch to Alice
        sim.setAliceContext(sim.getContractState());
        sim.revealWinningNumber(winningNum, sim.aliceSk);

        // switch to claire, but persist state
        claire.updateCallerContext(sim.getContractState());
        sim.switchCaller(claire.callerContext);
        // Claire had the winning number
        sim.claimWin();
        const realFinalLedgerState = sim.getLedger();
        expect(realFinalLedgerState.winnerList.member({bytes: claireEncoded})).toBeTruthy();
        expect(realFinalLedgerState.winnerList.lookup({bytes: claireEncoded})).toEqual(BigInt(10));
        // bob lost
        expect(realFinalLedgerState.winnerList.member({bytes: bobEncoded})).toBeFalsy();
    });
    it('Allows different bets', () => {
        const winningNum = BigInt(29);
        const sim = new RouletteSimulator(winningNum);

        const bob = new WalletBuilder(sim.contractAddress, sim.getContractState());
        sim.switchCaller(bob.callerContext);
        const bobsBet = BigSmall.BIG;
        const bobBetAmount = BigInt(50);
        sim.betBigSmall(bobBetAmount, bobsBet);
        const bobLedgerState = sim.getLedger();
        const bobEncoded = encodeCoinPublicKey(bob.address);
        expect(bobLedgerState.bigSmallBetAmounts.lookup({bytes: bobEncoded})).toEqual(bobBetAmount);
        expect(bobLedgerState.bigSmallBets.lookup({bytes: bobEncoded})).toEqual(bobsBet);
        expect(bobLedgerState.betCount).toEqual(1n);

        const claire = new WalletBuilder(sim.contractAddress, sim.getContractState());
        sim.switchCaller(claire.callerContext);
        const clairesBet = EvenOdd.EVEN;
        const claireBetAmount = BigInt(100);
        sim.betEvenOdd(claireBetAmount, clairesBet);
        const claireLedgerState = sim.getLedger();
        const claireEncoded = encodeCoinPublicKey(claire.address);
        expect(claireLedgerState.evenOddBets.lookup({bytes: claireEncoded})).toEqual(clairesBet);
        expect(claireLedgerState.evenOddBetAmounts.lookup({bytes: claireEncoded})).toEqual(claireBetAmount);
        expect(claireLedgerState.betCount).toEqual(2n);

        const don = new WalletBuilder(sim.contractAddress, sim.getContractState());
        sim.switchCaller(don.callerContext);
        const donsBet = Thirds.FIRST;
        const donBetAmount = BigInt(99);
        expect(() => {
            sim.betThirds(BigInt(101), donsBet);
        }).toThrow("That bet exceeds the table limit");
        sim.betThirds(donBetAmount, donsBet);
        const donLedgerState = sim.getLedger();
        const donEncoded = encodeCoinPublicKey(don.address);
        expect(donLedgerState.thirdBets.lookup({bytes: donEncoded})).toEqual(donsBet);
        expect(donLedgerState.thirdBetAmounts.lookup({bytes: donEncoded})).toEqual(donBetAmount);
        expect(donLedgerState.betCount).toEqual(3n);

        const edith = new WalletBuilder(sim.contractAddress, sim.getContractState());
        sim.switchCaller(edith.callerContext);
        const edithBet = Color.RED;
        const edithBetAmount = BigInt(5);
        sim.betColor(edithBetAmount, edithBet);
        const edithLedgerState = sim.getLedger();
        const edithEncoded = encodeCoinPublicKey(edith.address);
        expect(edithLedgerState.colorBets.lookup({bytes: edithEncoded})).toEqual(edithBet);
        expect(edithLedgerState.colorBetAmounts.lookup({bytes: edithEncoded})).toEqual(edithBetAmount);
        expect(edithLedgerState.betCount).toEqual(4n);

        const frank = new WalletBuilder(sim.contractAddress, sim.getContractState());
        sim.switchCaller(frank.callerContext);
        const frankBet = BigInt(35);
        const frankBetAmount = BigInt(50);
        sim.betNumber(frankBetAmount, frankBet);
        let frankLedgerState = sim.getLedger();
        const frankEncoded = encodeCoinPublicKey(frank.address);
        expect(frankLedgerState.numberBets.lookup({bytes: frankEncoded})).toEqual(frankBet);
        expect(frankLedgerState.numberBetAmounts.lookup({bytes: frankEncoded})).toEqual(frankBetAmount);
        expect(frankLedgerState.betCount).toEqual(5n);

        // testing callerContext persistence
        sim.betColor(frankBetAmount, Color.BLACK);
        frankLedgerState = sim.getLedger();
        expect(frankLedgerState.betCount).toEqual(6n);
        // go up to 10 bets?
    });
});