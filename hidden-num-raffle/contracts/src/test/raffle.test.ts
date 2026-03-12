import { RaffleSimulator, WalletBuilder } from './raffle-simulator.js';
import { NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { describe, it, expect } from 'vitest';
import { WinnerState } from '../managed/hidden-num-raffle/contract/index.js';

setNetworkId('undeployed' as NetworkId);

describe("Raffle Smart Contract", () => {
    it("executes the constructor correctly", () => {
        const sim = new RaffleSimulator(BigInt(5));
        const aliceDappPubKey = sim.publicKey(sim.aliceSk);

        const ledgerState = sim.getLedger();
        expect(ledgerState.assignedNumbers).toEqual(0n);
        expect(ledgerState.state).toEqual(WinnerState.UNSET);
        expect(ledgerState.raffleOrganizer).toEqual(aliceDappPubKey);
    });
    it('allows getTicket', () => {
        const sim = new RaffleSimulator(BigInt(5));
        const bob = new WalletBuilder();
        const claire = new WalletBuilder();
        const darren = new WalletBuilder();
        const ezra = new WalletBuilder();

        sim.getTicket(bob.sk);
        sim.getTicket(claire.sk);
        sim.getTicket(darren.sk);
        sim.getTicket(ezra.sk);
        const ledgerState = sim.getLedger();

        expect(ledgerState.assignedNumbers).toEqual(4n);
        expect(() => {
            sim.getTicket(bob.sk);
        }).toThrow("You are already in the list");
        expect(() => {
            sim.getTicket(claire.sk);
        }).toThrow("You are already in the list");

        const fred = new WalletBuilder();
        const greg = new WalletBuilder();
        const hector = new WalletBuilder();
        const idris = new WalletBuilder();
        const joe = new WalletBuilder();
        const kat = new WalletBuilder();// 10

        sim.getTicket(fred.sk);
        sim.getTicket(greg.sk);
        sim.getTicket(hector.sk);
        sim.getTicket(idris.sk);
        sim.getTicket(joe.sk);
        sim.getTicket(kat.sk);
        const newLedgerState = sim.getLedger();

        expect(newLedgerState.assignedNumbers).toEqual(10n);
        const larry = new WalletBuilder();
        expect(() => {
            sim.getTicket(larry.sk);
        }).toThrow("Max tickets reached");
    });
    it('Reveals the winning number', () => {
        const winningNum = BigInt(5);
        const sim = new RaffleSimulator(winningNum);
        // create 10 wallets
        const bob = new WalletBuilder();
        const claire = new WalletBuilder();
        const darren = new WalletBuilder();
        const ezra = new WalletBuilder();
        const fred = new WalletBuilder();
        const greg = new WalletBuilder();
        const hector = new WalletBuilder();
        const idris = new WalletBuilder();
        const joe = new WalletBuilder();
        const kat = new WalletBuilder();// 10

        // get 10 tickets
        sim.getTicket(bob.sk);
        sim.getTicket(claire.sk);
        sim.getTicket(darren.sk);
        sim.getTicket(ezra.sk);
        sim.getTicket(fred.sk);
        sim.getTicket(greg.sk);
        sim.getTicket(hector.sk);
        sim.getTicket(idris.sk);
        sim.getTicket(joe.sk);
        sim.getTicket(kat.sk);
        
        // all tickets out, reveal a winner
        expect(() => {
            sim.revealWinner(winningNum, joe.sk);
        }).toThrow("You are not the organizer");

        // organizer reveals
        sim.revealWinner(winningNum, sim.aliceSk);

        const ledgerState = sim.getLedger();
        expect(ledgerState.assignedNumbers).toEqual(10n);
        expect(ledgerState.publicWinningNum).toEqual(winningNum);
    });
    it('allows winner to claim', () => {
        const winningNum = BigInt(5);
        const sim = new RaffleSimulator(winningNum);
        // create 10 wallets
        const bob = new WalletBuilder();
        const claire = new WalletBuilder();
        const darren = new WalletBuilder();
        const ezra = new WalletBuilder();
        const fred = new WalletBuilder();
        const greg = new WalletBuilder();
        const hector = new WalletBuilder();
        const idris = new WalletBuilder();
        const joe = new WalletBuilder();
        const kat = new WalletBuilder();// 10

        // get 10 tickets
        sim.getTicket(bob.sk);
        sim.getTicket(claire.sk);
        sim.getTicket(darren.sk);
        sim.getTicket(ezra.sk);
        sim.getTicket(fred.sk);// winner
        sim.getTicket(greg.sk);
        sim.getTicket(hector.sk);
        sim.getTicket(idris.sk);
        sim.getTicket(joe.sk);
        sim.getTicket(kat.sk);

        // organizer reveals
        sim.revealWinner(winningNum, sim.aliceSk);

        // claim win
        expect(() => {
            sim.claimWin(kat.sk);
        }).toThrow("You do not have the winning number");
        
        sim.claimWin(fred.sk);
        const ledgerState = sim.getLedger();
        expect(ledgerState.state).toEqual(WinnerState.SET);

        const winnerDappPubKey = sim.publicKey(fred.sk);
        expect(ledgerState.winner).toEqual(winnerDappPubKey);
    });
    it('blocks out of bounds numbers', () => {
        expect(() => {
            const sim = new RaffleSimulator(BigInt(11));
        }).toThrow("Winning number must be between 1-10");
        expect(() => {
            const sim = new RaffleSimulator(BigInt(0));
        }).toThrow("Winning number must be between 1-10");
    });
    it('forces correct revealing of the winning number', () => {
        const winningNum = BigInt(1);
        const sim = new RaffleSimulator(winningNum);
        // create 10 wallets
        const bob = new WalletBuilder();
        const claire = new WalletBuilder();
        const darren = new WalletBuilder();
        const ezra = new WalletBuilder();
        const fred = new WalletBuilder();
        const greg = new WalletBuilder();
        const hector = new WalletBuilder();
        const idris = new WalletBuilder();
        const joe = new WalletBuilder();
        const kat = new WalletBuilder();// 10

        // get 10 tickets
        sim.getTicket(bob.sk);
        sim.getTicket(claire.sk);
        sim.getTicket(darren.sk);
        sim.getTicket(ezra.sk);
        sim.getTicket(fred.sk);
        sim.getTicket(greg.sk);
        sim.getTicket(hector.sk);
        sim.getTicket(idris.sk);
        sim.getTicket(joe.sk);
        sim.getTicket(kat.sk);

        expect(() => {
            sim.revealWinner(BigInt(5), sim.aliceSk);
        }).toThrow("Wrong winning number provided, shame on you");

        sim.revealWinner(winningNum, sim.aliceSk);
        const ledgerState = sim.getLedger();

        expect(ledgerState.publicWinningNum).toEqual(winningNum);
    });
})