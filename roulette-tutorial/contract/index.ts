import { CompiledContract } from '@midnight-ntwrk/compact-js';
import path from 'node:path';

export {
    Contract as RouletteContract,
    ledger as rouletteLedger,
    pureCircuits as roulettePureCircuits,
    BetState,
    Color,
    type Ledger as RouletteLedger,
} from './managed/roulette/contract/index.js';

export {
    Contract as ChipsContract,
    ledger as chipsLedger,
    pureCircuits as chipsPureCircuits,
    type Ledger as ChipsLedger,
} from './managed/chips/contract/index.js';

import { rouletteWitnesses, chipsWitnesses } from './witnesses.js';
import { Contract as RouletteContractClass } from './managed/roulette/contract/index.js';
import { Contract as ChipsContractClass } from './managed/chips/contract/index.js';

const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');
export const rouletteZkConfigPath = path.resolve(currentDir, 'managed', 'roulette');
export const chipsZkConfigPath = path.resolve(currentDir, 'managed', 'chips');

export const CompiledRouletteContract = CompiledContract.make(
    'RouletteContract',
    RouletteContractClass,
).pipe(
    CompiledContract.withWitnesses(rouletteWitnesses),
    CompiledContract.withCompiledFileAssets(rouletteZkConfigPath),
);

export const CompiledChipsContract = CompiledContract.make(
    'ChipsContract',
    ChipsContractClass,
).pipe(
    CompiledContract.withWitnesses(chipsWitnesses),
    CompiledContract.withCompiledFileAssets(chipsZkConfigPath),
);
