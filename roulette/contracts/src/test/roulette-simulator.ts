import {
    type CircuitContext,
    sampleContractAddress,
    createConstructorContext,
    CostModel,
    QueryContext,
    sampleUserAddress,
    createCircuitContext,
    ContractState,
    ChargedState
} from "@midnight-ntwrk/compact-runtime";
import { 
    Contract,
    type Ledger,
    ledger,
    BetState,
    Color,
    Thirds,
    EvenOdd,
    BigSmall
 } from "../managed/roulette/contract/index.js";
import { 
    type RoulettePrivateState, 
    createRoulettePrivateState,
    witnesses,
} from "../witnesses.js";
import { randomBytes } from './utils.js';

export class RouletteSimulator {
    readonly contract: Contract<RoulettePrivateState>;
    contractAddress: string;
    aliceAddress: string;
    alicePrivateState: RoulettePrivateState;
    aliceSk: Uint8Array;
    maxBets: bigint;
    maxBetAmount: bigint;
    circuitContext: CircuitContext<RoulettePrivateState>;
    contractState: ContractState;

    constructor(winningNum: bigint) {
        this.contract = new Contract<RoulettePrivateState>(witnesses);
        this.contractAddress = sampleContractAddress();
        this.aliceAddress = sampleUserAddress();
        this.aliceSk = randomBytes(32);
        this.maxBets = BigInt(10);
        this.maxBetAmount = BigInt(100);
        this.alicePrivateState = createRoulettePrivateState(
            BetState.CLOSED, 
            BigInt(100),
            this.aliceSk,
        );

        const {
            currentPrivateState,
            currentContractState,
            currentZswapLocalState
        } = this.contract.initialState(
            createConstructorContext(this.alicePrivateState, this.aliceAddress),
            this.maxBetAmount,
            this.maxBets,
            winningNum,
            this.aliceSk,
        );
        this.contractState = currentContractState;
        this.circuitContext = {
            currentPrivateState,
            currentZswapLocalState,
            costModel: CostModel.initialCostModel(),
            currentQueryContext: new QueryContext(
                currentContractState.data,
                this.contractAddress
            ),
        };

        // this.bobContext = createCircuitContext(
        //     this.contractAddress,
        //     this.bobAddress,
        //     //currentZswapLocalState,
        //     this.bobPrivateState.contractState,
        //     this.bobPrivateState
        // );
    }// end of constructor

    public switchCaller(callerContext: CircuitContext): void {
        this.circuitContext = callerContext;
    }

    public getContractState(): ChargedState {
        return this.circuitContext.currentQueryContext.state;
    }

        //     this.callerContext = createCircuitContext(
        //     contractAddress,
        //     this.address,
        //     contractState,
        //     this.privateState
        // );
    public setAliceContext(contractState: ChargedState): void {
        this.circuitContext = createCircuitContext(
            this.contractAddress,
            this.aliceAddress,
            contractState,
            this.alicePrivateState
        );
    }

    // Wrappers for exported smart contract circuits
    public betColor(betAmount: bigint, colorBet: Color): void {
        // destruture these from the call in order to grab granular pieces {context, result}
        this.circuitContext = this.contract.impureCircuits.betColor(
            this.circuitContext,
            betAmount,
            colorBet
        ).context;
    }

    public betThirds(betAmount: bigint, thirdBet: Thirds): void {
        this.circuitContext = this.contract.impureCircuits.betThirds(
            this.circuitContext,
            betAmount,
            thirdBet
        ).context;
    }

    public betEvenOdd(betAmount: bigint, betEvenOdd: EvenOdd): void {
        this.circuitContext = this.contract.impureCircuits.betEvenOdd(
            this.circuitContext,
            betAmount,
            betEvenOdd
        ).context;
    }

    public betBigSmall(betAmount: bigint, betBigSmall: BigSmall): void {
        this.circuitContext = this.contract.impureCircuits.betBigSmall(
            this.circuitContext,
            betAmount,
            betBigSmall
        ).context;
    }

    public betNumber(betAmount: bigint, number: bigint): void {
        this.circuitContext = this.contract.impureCircuits.betNumber(
            this.circuitContext,
            betAmount,
            number
        ).context;
    }

    // public betNumber(betAmount: bigint, number: bigint): CircuitContext {
    //     // destructure to get the context and result seperately (for return values)
    //     const {context, result} = this.contract.impureCircuits.betNumber(
    //         this.circuitContext,
    //         betAmount,
    //         number
    //     );
    //     foo = result;
    //     this.circuitContext = context;
    //     return this.circuitContext;
    // }

    public revealWinningNumber(winningNum: bigint, sk: Uint8Array): void {
        this.circuitContext = this.contract.impureCircuits.revealWinningNumber(
            this.circuitContext,
            winningNum,
            sk
        ).context;
    }

    public claimWin(): void {
        this.circuitContext = this.contract.impureCircuits.claimWin(
            this.circuitContext
        ).context;
    }

    public getLedger(): Ledger {
        return ledger(this.circuitContext.currentQueryContext.state);
    }
}// end of class


export class WalletBuilder {
    address: string;
    sk: Uint8Array;
    callerContext: CircuitContext<RoulettePrivateState>;
    privateState: RoulettePrivateState;// @TODO -- make better private states
    contractAddress: string;

    // pass in the current contractState at the time of building the wallet
    // if other calls to the contract are made by other users, the updateCallerContext
    // needs to be called, passing in the recent contractState
    constructor(contractAddress: string, contractState: ChargedState) {
        this.address = sampleUserAddress();
        this.sk = randomBytes(32);
        this.privateState = createRoulettePrivateState(BetState.OPEN, BigInt(19), this.sk);
        this.contractAddress = contractAddress;
        this.callerContext = createCircuitContext(
            this.contractAddress,
            this.address,
            contractState,
            this.privateState
        );
    }
    public updateCallerContext(contractState: ChargedState) : void {
        this.callerContext = createCircuitContext(
            this.contractAddress,
            this.address,
            contractState,
            this.privateState
        );
    }
}
