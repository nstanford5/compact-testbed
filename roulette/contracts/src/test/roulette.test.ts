import { RouletteSimulator, WalletBuilder } from './roulette-simulator.js';
import { NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { describe, it, expect } from 'vitest';
import { BetState } from '../managed/roulette/contract/index.js';

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
    })
});