import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomBytes } from 'node:crypto';
import { setNetworkId } from '@midnight-ntwrk/midnight-js/network-id';
import {
    deployContract,
    submitCallTx,
    type DeployedContract,
} from '@midnight-ntwrk/midnight-js/contracts';
import {
    type ContractAddress,
    decodeRawTokenType,
    encodeCoinPublicKey,
} from '@midnight-ntwrk/compact-runtime';
import pino from 'pino';

import { getConfig } from '../config.js';
import { MidnightWalletProvider, syncWallet } from '../wallet.js';
import { buildProviders, type RouletteProviders } from '../providers.js';
import {
    CompiledRouletteContract,
    CompiledChipsContract,
    RouletteContract,
    ChipsContract,
    rouletteLedger,
    chipsLedger,
    BetState,
    Color,
    rouletteZkConfigPath,
    chipsZkConfigPath,
} from '../../contract/index.js';
import { createRoulettePrivateState } from '../../contract/witnesses.js';
import type { EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import type { FinalizedCallTxData } from '@midnight-ntwrk/midnight-js/contracts';

const logger = pino({
    level: process.env['LOG_LEVEL'] ?? 'info',
    transport: { target: 'pino-pretty' },
});

// NIGHT token type from the chain — used to filter the chip coin out of the
// wallet's available shielded coins.
const NIGHT_TOKEN_TYPE_HEX =
    '0000000000000000000000000000000000000000000000000000000000000000';

type ShieldedCoinArg = { nonce: Uint8Array; color: Uint8Array; value: bigint };

describe('Roulette + shielded chips via midnight-js', () => {
    let aliceWallet: MidnightWalletProvider;
    let bobWallet: MidnightWalletProvider;
    let claireWallet: MidnightWalletProvider;

    // One providers object per (wallet, contract) — each contract has its own
    // managed/<name>/keys directory and the NodeZkConfigProvider takes only
    // a single root path.
    let aliceChipsProv: RouletteProviders;
    let bobChipsProv: RouletteProviders;
    let claireChipsProv: RouletteProviders;
    let aliceRouletteProv: RouletteProviders;
    let bobRouletteProv: RouletteProviders;
    let claireRouletteProv: RouletteProviders;

    let chipsAddress: ContractAddress;
    let chipColorBytes: Uint8Array;
    let chipColorHex: string;
    let rouletteAddress: ContractAddress;

    const config = getConfig();
    const seed1 = '0000000000000000000000000000000000000000000000000000000000000001';
    const seed2 = '0000000000000000000000000000000000000000000000000000000000000002';
    const seed3 = '0000000000000000000000000000000000000000000000000000000000000003';

    const ALICE_CHIPS_PRIVATE_ID = 'AliceChipsPrivateState';
    const ALICE_ROULETTE_PRIVATE_ID = 'AliceRoulettePrivateState';
    const BOB_CHIPS_PRIVATE_ID = 'BobChipsPrivateState';
    const BOB_ROULETTE_PRIVATE_ID = 'BobRoulettePrivateState';
    const CLAIRE_CHIPS_PRIVATE_ID = 'ClaireChipsPrivateState';
    const CLAIRE_ROULETTE_PRIVATE_ID = 'ClaireRoulettePrivateState';

    const MAX_BET_COUNT = 10n;
    const WINNING_NUMBER = 10n;

    // Each wallet has its own roulette/chips secret (so dapp pseudonyms differ).
    const aliceSk = new Uint8Array(randomBytes(32));
    const bobSk = new Uint8Array(randomBytes(32));
    const claireSk = new Uint8Array(randomBytes(32));

    async function queryRoulette() {
        const state =
            await aliceRouletteProv.publicDataProvider.queryContractState(rouletteAddress);
        expect(state).not.toBeNull();
        return rouletteLedger(state!.data);
    }

    // Pull a shielded coin of `chipColor` out of a wallet's pool and reshape
    // it to the ShieldedCoinInfo argument expected by the bet circuits.
    async function takeChipCoin(
        walletProvider: MidnightWalletProvider,
    ): Promise<ShieldedCoinArg> {
        const facadeState = await walletProvider.wallet.waitForSyncedState();
        const coins = facadeState.shielded.availableCoins;
        const chip = coins.find((c) => c.coin.type === chipColorHex);
        if (!chip) {
            const seen = coins.map((c) => c.coin.type).join(', ');
            throw new Error(
                `No chip coin (type=${chipColorHex}) in wallet. Saw types: [${seen}]`,
            );
        }
        return {
            nonce: Uint8Array.from(Buffer.from(chip.coin.nonce, 'hex')),
            color: chipColorBytes,
            value: chip.coin.value,
        };
    }

    beforeAll(async () => {
        setNetworkId(config.networkId);

        const envConfig: EnvironmentConfiguration = {
            walletNetworkId: config.networkId,
            networkId: config.networkId,
            indexer: config.indexer,
            indexerWS: config.indexerWS,
            node: config.node,
            nodeWS: config.nodeWS,
            faucet: config.faucet,
            proofServer: config.proofServer,
        };

        aliceWallet = await MidnightWalletProvider.build(logger, envConfig, seed1);
        await aliceWallet.start();
        await syncWallet(logger, aliceWallet.wallet, 600_000);

        bobWallet = await MidnightWalletProvider.build(logger, envConfig, seed2);
        await bobWallet.start();
        await syncWallet(logger, bobWallet.wallet, 600_000);

        claireWallet = await MidnightWalletProvider.build(logger, envConfig, seed3);
        await claireWallet.start();
        await syncWallet(logger, claireWallet.wallet, 600_000);

        aliceChipsProv = buildProviders(aliceWallet, chipsZkConfigPath, config, 'chips-alice');
        bobChipsProv = buildProviders(bobWallet, chipsZkConfigPath, config, 'chips-bob');
        claireChipsProv = buildProviders(claireWallet, chipsZkConfigPath, config, 'chips-claire');
        aliceRouletteProv = buildProviders(aliceWallet, rouletteZkConfigPath, config, 'roulette-alice');
        bobRouletteProv = buildProviders(bobWallet, rouletteZkConfigPath, config, 'roulette-bob');
        claireRouletteProv = buildProviders(claireWallet, rouletteZkConfigPath, config, 'roulette-claire');
        logger.info('All providers initialized.');
    });

    afterAll(async () => {
        if (aliceWallet) await aliceWallet.stop();
        if (bobWallet) await bobWallet.stop();
        if (claireWallet) await claireWallet.stop();
    });

    it('Alice deploys the chips contract', async () => {
        const alicePrivateState = createRoulettePrivateState(aliceSk);

        logger.info('Deploying chips contract...');
        const deployed: DeployedContract<ChipsContract> =
            await (deployContract<ChipsContract>)(aliceChipsProv, {
                compiledContract: CompiledChipsContract,
                privateStateId: ALICE_CHIPS_PRIVATE_ID,
                initialPrivateState: alicePrivateState,
            });

        chipsAddress = deployed.deployTxData.public.contractAddress;
        logger.info(`Chips contract deployed at ${chipsAddress}`);
        expect(chipsAddress).toBeDefined();
    });

    it('Alice mints chips to Bob and Claire', async () => {
        // Bob and Claire seed their chips/roulette private state with their
        // own secrets so that each wallet has its own dapp pseudonym.
        const bobPS = createRoulettePrivateState(bobSk);
        const clairePS = createRoulettePrivateState(claireSk);
        bobChipsProv.privateStateProvider.setContractAddress(chipsAddress);
        await bobChipsProv.privateStateProvider.set(BOB_CHIPS_PRIVATE_ID, bobPS);
        claireChipsProv.privateStateProvider.setContractAddress(chipsAddress);
        await claireChipsProv.privateStateProvider.set(CLAIRE_CHIPS_PRIVATE_ID, clairePS);

        const bobCoinPk = bobWallet.getCoinPublicKey();
        const claireCoinPk = claireWallet.getCoinPublicKey();
        const bobCoinPkBytes = { bytes: encodeCoinPublicKey(bobCoinPk) };
        const claireCoinPkBytes = { bytes: encodeCoinPublicKey(claireCoinPk) };

        // The SDK needs each recipient's encryption public key to encrypt the
        // shielded output's value field. Each wallet exposes its own; pass
        // them as additionalCoinEncPublicKeyMappings on the call.
        const encMap = new Map<string, string>([
            [bobCoinPk, bobWallet.getEncryptionPublicKey()],
            [claireCoinPk, claireWallet.getEncryptionPublicKey()],
        ]);

        logger.info('Alice minting 200 chips to Bob...');
        await (submitCallTx<ChipsContract, 'mint'>)(aliceChipsProv, {
            compiledContract: CompiledChipsContract,
            contractAddress: chipsAddress,
            privateStateId: ALICE_CHIPS_PRIVATE_ID,
            circuitId: 'mint',
            args: [bobCoinPkBytes, 200n],
            additionalCoinEncPublicKeyMappings: encMap,
        });
        logger.info('Alice minting 200 chips to Claire...');
        await (submitCallTx<ChipsContract, 'mint'>)(aliceChipsProv, {
            compiledContract: CompiledChipsContract,
            contractAddress: chipsAddress,
            privateStateId: ALICE_CHIPS_PRIVATE_ID,
            circuitId: 'mint',
            args: [claireCoinPkBytes, 200n],
            additionalCoinEncPublicKeyMappings: encMap,
        });

        // Read the chip color off the contract's ledger so the test can find
        // the chip coin in each player's wallet.
        const chipsState =
            await aliceChipsProv.publicDataProvider.queryContractState(chipsAddress);
        expect(chipsState).not.toBeNull();
        const ledger = chipsLedger(chipsState!.data);
        chipColorBytes = ledger.tokenColor;
        chipColorHex = decodeRawTokenType(chipColorBytes);
        logger.info(`Chip token color: ${chipColorHex}`);
        expect(chipColorBytes.some((b) => b !== 0)).toBe(true);

        // Bob's and Claire's shielded wallets should now hold chip coins.
        await syncWallet(logger, bobWallet.wallet, 600_000);
        await syncWallet(logger, claireWallet.wallet, 600_000);
        const bobState = await bobWallet.wallet.waitForSyncedState();
        const claireState = await claireWallet.wallet.waitForSyncedState();
        const bobChipBalance = bobState.shielded.balances[chipColorHex] ?? 0n;
        const claireChipBalance = claireState.shielded.balances[chipColorHex] ?? 0n;
        logger.info(`Bob chip balance: ${bobChipBalance}`);
        logger.info(`Claire chip balance: ${claireChipBalance}`);
        expect(bobChipBalance).toEqual(200n);
        expect(claireChipBalance).toEqual(200n);
    });

    it('Alice deploys the roulette contract referencing the chip color', async () => {
        const alicePrivateState = createRoulettePrivateState(aliceSk);

        logger.info('Deploying roulette contract...');
        const deployed: DeployedContract<RouletteContract> =
            await (deployContract<RouletteContract>)(aliceRouletteProv, {
                compiledContract: CompiledRouletteContract,
                privateStateId: ALICE_ROULETTE_PRIVATE_ID,
                initialPrivateState: alicePrivateState,
                args: [MAX_BET_COUNT, WINNING_NUMBER, chipColorBytes],
            });

        rouletteAddress = deployed.deployTxData.public.contractAddress;
        logger.info(`Roulette deployed at ${rouletteAddress}`);

        const state = await queryRoulette();
        expect(state.betState).toEqual(BetState.OPEN);
        expect(state.maxBetCount).toEqual(MAX_BET_COUNT);
        expect(state.betCount).toEqual(0n);
        expect(Buffer.from(state.chipColor).toString('hex')).toEqual(
            Buffer.from(chipColorBytes).toString('hex'),
        );
    });

    it('Bob places a number bet using a chip coin', async () => {
        const bobPS = createRoulettePrivateState(bobSk);
        bobRouletteProv.privateStateProvider.setContractAddress(rouletteAddress);
        await bobRouletteProv.privateStateProvider.set(BOB_ROULETTE_PRIVATE_ID, bobPS);

        const chip = await takeChipCoin(bobWallet);
        logger.info(`Bob is betting a chip coin (value=${chip.value}) on number ${WINNING_NUMBER}`);

        const _txData: FinalizedCallTxData<RouletteContract, 'betNumber'> =
            await (submitCallTx<RouletteContract, 'betNumber'>)(bobRouletteProv, {
                compiledContract: CompiledRouletteContract,
                contractAddress: rouletteAddress,
                privateStateId: BOB_ROULETTE_PRIVATE_ID,
                circuitId: 'betNumber',
                args: [chip, WINNING_NUMBER],
            });

        const state = await queryRoulette();
        expect(state.betCount).toEqual(1n);
    });

    it('Claire places a color bet on RED using a chip coin', async () => {
        const clairePS = createRoulettePrivateState(claireSk);
        claireRouletteProv.privateStateProvider.setContractAddress(rouletteAddress);
        await claireRouletteProv.privateStateProvider.set(CLAIRE_ROULETTE_PRIVATE_ID, clairePS);

        const chip = await takeChipCoin(claireWallet);
        logger.info(`Claire is betting a chip coin (value=${chip.value}) on RED`);

        await (submitCallTx<RouletteContract, 'betColor'>)(claireRouletteProv, {
            compiledContract: CompiledRouletteContract,
            contractAddress: rouletteAddress,
            privateStateId: CLAIRE_ROULETTE_PRIVATE_ID,
            circuitId: 'betColor',
            args: [chip, Color.RED],
        });

        const state = await queryRoulette();
        expect(state.betCount).toEqual(2n);
    });

    it('Blocks Alice (the house) from placing a bet', async () => {
        // Alice would need a chip coin to even attempt this; she has none.
        // The bet should fail either at chip-presence or at the
        // `player != theHouse` assert. We accept either failure mode.
        logger.info('Alice tries to bet (should fail)...');
        await expect(async () => {
            const dummy: ShieldedCoinArg = {
                nonce: new Uint8Array(32),
                color: chipColorBytes,
                value: 1n,
            };
            await (submitCallTx<RouletteContract, 'betNumber'>)(aliceRouletteProv, {
                compiledContract: CompiledRouletteContract,
                contractAddress: rouletteAddress,
                privateStateId: ALICE_ROULETTE_PRIVATE_ID,
                circuitId: 'betNumber',
                args: [dummy, 20n],
            });
        }).rejects.toThrow();
        logger.info('Alice was rejected.');
    });

    it('Alice reveals the winning number', async () => {
        logger.info('Alice revealing the winning number...');
        await (submitCallTx<RouletteContract, 'revealWinningNumber'>)(aliceRouletteProv, {
            compiledContract: CompiledRouletteContract,
            contractAddress: rouletteAddress,
            privateStateId: ALICE_ROULETTE_PRIVATE_ID,
            circuitId: 'revealWinningNumber',
            args: [WINNING_NUMBER],
        });

        const state = await queryRoulette();
        expect(state.betState).toEqual(BetState.CLOSED);
        expect(state.winningNumPublic).toEqual(WINNING_NUMBER);
    });

    it('Bob claims his win — recorded by dapp pseudonym only', async () => {
        await (submitCallTx<RouletteContract, 'claimWin'>)(bobRouletteProv, {
            compiledContract: CompiledRouletteContract,
            contractAddress: rouletteAddress,
            privateStateId: BOB_ROULETTE_PRIVATE_ID,
            circuitId: 'claimWin',
        });

        const state = await queryRoulette();
        // Exactly one winner, identified only by their dapp pseudonym.
        expect(state.winnerList.size()).toEqual(1n);
    });
});
