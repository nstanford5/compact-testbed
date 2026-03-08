import {
    type CircuitContext,
    sampleContractAddress,
    createConstructorContext,
    CostModel,
    QueryContext,
} from "@midnight-ntwrk/compact-runtime";
import { 
    Contract,
    type Ledger,
    ledger,
    PartyState,
 } from "../managed/private-party/contract/index.js";
import { 
    type PartyPrivateState, 
    witnesses, 
    createPartyPrivateState 
} from "../witnesses.js";

export class PartySimulator {
    readonly contract: Contract<PartyPrivateState>;
    circuitContext: CircuitContext<PartyPrivateState>;
    startingState: PartyPrivateState;

    constructor() {
        this.contract = new Contract<PartyPrivateState>(witnesses);
        this.startingState = createPartyPrivateState(PartyState.NOT_READY);
        const {
            currentPrivateState,
            currentContractState,
            currentZswapLocalState
        } = this.contract.initialState(
            createConstructorContext(this.startingState, "0".repeat(64)),
        );
        this.circuitContext = {
            currentPrivateState,
            currentZswapLocalState,
            costModel: CostModel.initialCostModel(),
            currentQueryContext: new QueryContext(
                currentContractState.data,
                sampleContractAddress(),
            ),
        };
    }
    
    // helper test function
    public getLedger(): Ledger {
        return ledger(this.circuitContext.currentQueryContext.state);
    }

    // helper test function
    public getPrivateState(): PartyPrivateState {
        return this.circuitContext.currentPrivateState;
    }

    // The rest are exported contract circuits
    public addOrganizer(newOrganizerPk: Uint8Array): void {
        this.circuitContext = this.contract.impureCircuits.addOrganizer(
            this.circuitContext,
            { bytes: newOrganizerPk },
        ).context;
    }

    public addParticipant(participantPk: Uint8Array, organizerSk: Uint8Array): void {
        this.circuitContext = this.contract.impureCircuits.addParticipant(
            this.circuitContext,// this must always be included?
            participantPk,
            organizerSk,
        ).context;
    }

    public checkIn(participantPk: Uint8Array, organizerSk: Uint8Array): void {
        this.circuitContext = this.contract.impureCircuits.checkIn(
            this.circuitContext,
            participantPk,
            organizerSk,
        ).context;
    }

    public chainStartParty(): void {
        this.circuitContext = this.contract.impureCircuits.chainStartParty(
            this.circuitContext,
        ).context;
    }

    // don't need to write this because it is an internal contract function?
    // public commitWithSk(participantPk: Uint8Array, organizerSk: Uint8Array): Uint8Array {
    //     return this.contract.circuits.commitWithSk(
    //         this.circuitContext,
    //         participantPk, 
    //         organizerSk
    //     ).result;
    // }

    public publicKey(sk: Uint8Array): Uint8Array {
        return this.contract.circuits.publicKey(
            this.circuitContext,
            sk,
        ).result;
    }
}