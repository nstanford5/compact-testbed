// This test suite aims to demonstrate writing tests,
// it may not be comprehensive.
import { PartySimulator } from './party-simulator.js';
import { NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { describe, it, expect } from 'vitest';
import { randomBytes } from './utils.js';
import { PartyState } from '../managed/private-party/contract/index.js';

setNetworkId("undeployed" as NetworkId);

describe("Private Party smart contract", () => {
    it("executes the constructor correctly", () => {
        const sim0 = new PartySimulator();
        const ledgerState = sim0.getLedger();
        expect(ledgerState.organizers.size()).toEqual(1n);
        expect(ledgerState.partyState).toEqual(PartyState.NOT_READY);
        expect(ledgerState.maxListSize).toEqual(99n);
    });

    it("adds an organizer", () => {
        const sim0 = new PartySimulator();
        const initialLedgerState = sim0.getLedger();
        sim0.addOrganizer(randomBytes(32));
        const newLedgerState = sim0.getLedger();
        expect(initialLedgerState.organizers.size()).toEqual(1n);
        expect(newLedgerState.organizers.size()).toEqual(2n);
    });

    it("adds a participant", () => {
        const sim0 = new PartySimulator();
        const participant = randomBytes(32);
        const organizerSk = randomBytes(32);
        sim0.addParticipant(participant, organizerSk);
        
        const ledgerState = sim0.getLedger();
        expect(ledgerState.partiers).toEqual(1n);
        expect(ledgerState.hashedPartyGoers.size()).toEqual(1n);
    });

    it("starts the party with a less than full list", () => {
        const sim0 = new PartySimulator();
        const organizerSk = randomBytes(32);
        for(let i = 0; i < 25; i++){
            sim0.addParticipant(randomBytes(32), organizerSk);
        }
        const ledgerState = sim0.getLedger();
        expect(ledgerState.hashedPartyGoers.size()).toEqual(25n);

        sim0.chainStartParty();
        const newLedgerState = sim0.getLedger();
        expect(newLedgerState.partyState).toEqual(PartyState.READY);
    });

    it("starts the party with a full list", () => {
        const sim0 = new PartySimulator();
        const organizerSk = randomBytes(32);
        for(let i = 0; i < 99; i++){
            sim0.addParticipant(randomBytes(32), organizerSk);
        }
        const ledgerState = sim0.getLedger();
        expect(ledgerState.hashedPartyGoers.size()).toEqual(99n);
        expect(ledgerState.partyState).toEqual(PartyState.READY);
    });

    it("allows participants to check in", () => {
        const sim0 = new PartySimulator();
        const organizerSk = randomBytes(32);
        const participant = randomBytes(32);
        sim0.addParticipant(participant, organizerSk);
        for(let i = 1; i < 25; i++){
            sim0.addParticipant(randomBytes(32), organizerSk);
        }
        sim0.chainStartParty();
        const ledgerState = sim0.getLedger();
        expect(ledgerState.partyState).toEqual(PartyState.READY);

        sim0.checkIn(participant, organizerSk);
        const newLedgerState = sim0.getLedger();
        expect(newLedgerState.checkedInParty.member(participant)).toBeTruthy();
        expect(newLedgerState.checkedInParty.size()).toEqual(1n);
    });

})