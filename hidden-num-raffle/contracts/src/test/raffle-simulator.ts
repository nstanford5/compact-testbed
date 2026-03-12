import {
    type CircuitContext,
    sampleContractAddress,
    createConstructorContext,
    CostModel,
    QueryContext,
    sampleUserAddress,
} from "@midnight-ntwrk/compact-runtime";
import { 
    Contract,
    type Ledger,
    ledger,
    WinnerState,
 } from "../managed/hidden-num-raffle/contract/index.js";
import { 
    type RafflePrivateState, 
    createRafflePrivateState,
    witnesses
} from "../witnesses.js";
import { randomBytes } from './utils.js';


export class RaffleSimulator {
    readonly contract: Contract<RafflePrivateState>;
    contractAddress: string;
    aliceAddress: string;
    alicePrivateState: RafflePrivateState;
    aliceSk: Uint8Array;
    circuitContext: CircuitContext<RafflePrivateState>;

    constructor(winningNum: bigint) {
        this.contract = new Contract<RafflePrivateState>(witnesses);
        this.contractAddress = sampleContractAddress();
        this.aliceAddress = sampleUserAddress();
        this.aliceSk = randomBytes(32);
        this.alicePrivateState = createRafflePrivateState(WinnerState.UNSET, this.aliceSk);
        const {
            currentPrivateState,
            currentContractState,
            currentZswapLocalState
        } = this.contract.initialState(
            createConstructorContext(this.alicePrivateState, this.aliceAddress),
            winningNum,
            this.aliceSk
        );
        this.circuitContext = {
            currentPrivateState,
            currentZswapLocalState,
            costModel: CostModel.initialCostModel(),
            currentQueryContext: new QueryContext(
                currentContractState.data,
                this.contractAddress
            ),
        };
    }// end of constructor
    // smart contract circuit wrappers
    public publicKey(sk: Uint8Array): Uint8Array {
        return this.contract.circuits.publicKey(
            this.circuitContext,
            sk
        ).result;
    }
    public getTicket(sk: Uint8Array): void {
        this.circuitContext = this.contract.impureCircuits.getTicket(
            this.circuitContext,
            sk
        ).context;
    }
    public revealWinner(winningNum: bigint, sk: Uint8Array): void {
        this.circuitContext = this.contract.impureCircuits.revealWinner(
            this.circuitContext,
            winningNum,
            sk
        ).context;
    }
    // triggers state change to be looked up on ledger later
    public claimWin(sk: Uint8Array): void {
        this.circuitContext = this.contract.impureCircuits.claimWin(
            this.circuitContext,
            sk
        ).context;
    }


    // helper functions
    public getLedger(): Ledger {
        return ledger(this.circuitContext.currentQueryContext.state);
    }
}

export class WalletBuilder {
    address: string;
    sk: Uint8Array;

    constructor(){
        this.address = sampleUserAddress();
        this.sk = randomBytes(32);
    }
}
