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

const logger = pino({
    level: process.env['LOG_LEVEL'] ?? 'info',
    transport: { target: 'pino-pretty' },
});

type ShieldedCoinArg = { nonce: Uint8Array; color: Uint8Array; value: bigint };

describe('Roulette tutorial (RED/BLACK, 2x payouts, house match)', () => {
    let aliceWallet: MidnightWalletProvider;
    let bobWallet: MidnightWalletProvider;
    let claireWallet: MidnightWalletProvider;

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

    const BET_SIZE = 100n;
    // 1 is RED on a standard single-zero wheel. Bob bets RED → wins.
    const WINNING_NUMBER = 1n;

    const aliceSk = new Uint8Array(randomBytes(32));
    const bobSk = new Uint8Array(randomBytes(32));
    const claireSk = new Uint8Array(randomBytes(32));

    async function queryRoulette() {
        const state =
            await aliceRouletteProv.publicDataProvider.queryContractState(rouletteAddress);
        expect(state).not.toBeNull();
        return rouletteLedger(state!.data);
    }

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

    async function chipBalance(w: MidnightWalletProvider): Promise<bigint> {
        const state = await w.wallet.waitForSyncedState();
        return state.shielded.balances[chipColorHex] ?? 0n;
    }

    // Pick a still-available match coin whose value equals the requested
    // amount. claimMatch enforces match.value == bet.value in-circuit, so
    // the player-side picker must filter by value.
    async function pickMatchKeyOfValue(value: bigint): Promise<Uint8Array> {
        const state = await queryRoulette();
        for (const [key, coin] of state.houseCoins) {
            if (coin.value === value) return key;
        }
        throw new Error(`No house match coin of value ${value} available`);
    }

    // Find the loser's dapp pseudonym by scanning `bets` for an entry
    // whose color doesn't match the winning color.
    async function findLoserPseudonym(): Promise<Uint8Array> {
        const state = await queryRoulette();
        for (const [pseudo, bet] of state.bets) {
            if (bet !== state.color) return pseudo;
        }
        throw new Error('No losing bet found');
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
    });

    it('Alice mints chips to herself (2 for matches), Bob, and Claire', async () => {
        const bobPS = createRoulettePrivateState(bobSk);
        const clairePS = createRoulettePrivateState(claireSk);
        bobChipsProv.privateStateProvider.setContractAddress(chipsAddress);
        await bobChipsProv.privateStateProvider.set(BOB_CHIPS_PRIVATE_ID, bobPS);
        claireChipsProv.privateStateProvider.setContractAddress(chipsAddress);
        await claireChipsProv.privateStateProvider.set(CLAIRE_CHIPS_PRIVATE_ID, clairePS);

        const aliceCoinPk = aliceWallet.getCoinPublicKey();
        const bobCoinPk = bobWallet.getCoinPublicKey();
        const claireCoinPk = claireWallet.getCoinPublicKey();
        const aliceCoinPkBytes = { bytes: encodeCoinPublicKey(aliceCoinPk) };
        const bobCoinPkBytes = { bytes: encodeCoinPublicKey(bobCoinPk) };
        const claireCoinPkBytes = { bytes: encodeCoinPublicKey(claireCoinPk) };

        const encMap = new Map<string, string>([
            [aliceCoinPk, aliceWallet.getEncryptionPublicKey()],
            [bobCoinPk, bobWallet.getEncryptionPublicKey()],
            [claireCoinPk, claireWallet.getEncryptionPublicKey()],
        ]);

        // Two 100-chip coins to Alice (she'll deposit them as house matches).
        logger.info('Alice minting 100 chips to herself (coin #1)...');
        await (submitCallTx<ChipsContract, 'mint'>)(aliceChipsProv, {
            compiledContract: CompiledChipsContract,
            contractAddress: chipsAddress,
            privateStateId: ALICE_CHIPS_PRIVATE_ID,
            circuitId: 'mint',
            args: [aliceCoinPkBytes, BET_SIZE],
            additionalCoinEncPublicKeyMappings: encMap,
        });
        logger.info('Alice minting 100 chips to herself (coin #2)...');
        await (submitCallTx<ChipsContract, 'mint'>)(aliceChipsProv, {
            compiledContract: CompiledChipsContract,
            contractAddress: chipsAddress,
            privateStateId: ALICE_CHIPS_PRIVATE_ID,
            circuitId: 'mint',
            args: [aliceCoinPkBytes, BET_SIZE],
            additionalCoinEncPublicKeyMappings: encMap,
        });

        // 100 chips each to Bob and Claire.
        logger.info('Alice minting 100 chips to Bob...');
        await (submitCallTx<ChipsContract, 'mint'>)(aliceChipsProv, {
            compiledContract: CompiledChipsContract,
            contractAddress: chipsAddress,
            privateStateId: ALICE_CHIPS_PRIVATE_ID,
            circuitId: 'mint',
            args: [bobCoinPkBytes, BET_SIZE],
            additionalCoinEncPublicKeyMappings: encMap,
        });
        logger.info('Alice minting 100 chips to Claire...');
        await (submitCallTx<ChipsContract, 'mint'>)(aliceChipsProv, {
            compiledContract: CompiledChipsContract,
            contractAddress: chipsAddress,
            privateStateId: ALICE_CHIPS_PRIVATE_ID,
            circuitId: 'mint',
            args: [claireCoinPkBytes, BET_SIZE],
            additionalCoinEncPublicKeyMappings: encMap,
        });

        const chipsState =
            await aliceChipsProv.publicDataProvider.queryContractState(chipsAddress);
        const ledger = chipsLedger(chipsState!.data);
        chipColorBytes = ledger.tokenColor;
        chipColorHex = decodeRawTokenType(chipColorBytes);
        logger.info(`Chip token color: ${chipColorHex}`);

        await syncWallet(logger, aliceWallet.wallet, 600_000);
        await syncWallet(logger, bobWallet.wallet, 600_000);
        await syncWallet(logger, claireWallet.wallet, 600_000);
        expect(await chipBalance(aliceWallet)).toEqual(2n * BET_SIZE);
        expect(await chipBalance(bobWallet)).toEqual(BET_SIZE);
        expect(await chipBalance(claireWallet)).toEqual(BET_SIZE);
    });

    it('Alice deploys the roulette contract bound to the chip color', async () => {
        const alicePrivateState = createRoulettePrivateState(aliceSk);

        logger.info(`Deploying roulette contract bound to chip color ${chipColorHex}...`);
        const deployed: DeployedContract<RouletteContract> =
            await (deployContract<RouletteContract>)(aliceRouletteProv, {
                compiledContract: CompiledRouletteContract,
                privateStateId: ALICE_ROULETTE_PRIVATE_ID,
                initialPrivateState: alicePrivateState,
                args: [WINNING_NUMBER, chipColorBytes],
            });

        rouletteAddress = deployed.deployTxData.public.contractAddress;
        logger.info(`Roulette deployed at ${rouletteAddress}`);

        const state = await queryRoulette();
        expect(state.betState).toEqual(BetState.OPEN);
    });

    it('Alice deposits two match coins so the house can cover both bets', async () => {
        const match1 = await takeChipCoin(aliceWallet);
        expect(match1.value).toEqual(BET_SIZE);
        logger.info(`Alice depositing match coin #1 (value=${match1.value})...`);
        await (submitCallTx<RouletteContract, 'houseDeposit'>)(aliceRouletteProv, {
            compiledContract: CompiledRouletteContract,
            contractAddress: rouletteAddress,
            privateStateId: ALICE_ROULETTE_PRIVATE_ID,
            circuitId: 'houseDeposit',
            args: [match1],
        });

        await syncWallet(logger, aliceWallet.wallet, 600_000);
        const match2 = await takeChipCoin(aliceWallet);
        expect(match2.value).toEqual(BET_SIZE);
        logger.info(`Alice depositing match coin #2 (value=${match2.value})...`);
        await (submitCallTx<RouletteContract, 'houseDeposit'>)(aliceRouletteProv, {
            compiledContract: CompiledRouletteContract,
            contractAddress: rouletteAddress,
            privateStateId: ALICE_ROULETTE_PRIVATE_ID,
            circuitId: 'houseDeposit',
            args: [match2],
        });

        const state = await queryRoulette();
        expect(state.houseCoins.size()).toEqual(2n);

        await syncWallet(logger, aliceWallet.wallet, 600_000);
        expect(await chipBalance(aliceWallet)).toEqual(0n);
    });

    it('Bob bets RED with a 100-chip coin', async () => {
        const bobPS = createRoulettePrivateState(bobSk);
        bobRouletteProv.privateStateProvider.setContractAddress(rouletteAddress);
        await bobRouletteProv.privateStateProvider.set(BOB_ROULETTE_PRIVATE_ID, bobPS);

        const chip = await takeChipCoin(bobWallet);
        logger.info(`Bob is betting a chip coin (value=${chip.value}) on RED`);

        await (submitCallTx<RouletteContract, 'betColor'>)(bobRouletteProv, {
            compiledContract: CompiledRouletteContract,
            contractAddress: rouletteAddress,
            privateStateId: BOB_ROULETTE_PRIVATE_ID,
            circuitId: 'betColor',
            args: [chip, Color.RED],
        });

        const state = await queryRoulette();
        expect(state.betCoins.size()).toEqual(1n);
    });

    it('Claire bets BLACK with a 100-chip coin', async () => {
        const clairePS = createRoulettePrivateState(claireSk);
        claireRouletteProv.privateStateProvider.setContractAddress(rouletteAddress);
        await claireRouletteProv.privateStateProvider.set(CLAIRE_ROULETTE_PRIVATE_ID, clairePS);

        const chip = await takeChipCoin(claireWallet);
        logger.info(`Claire is betting a chip coin (value=${chip.value}) on BLACK`);

        await (submitCallTx<RouletteContract, 'betColor'>)(claireRouletteProv, {
            compiledContract: CompiledRouletteContract,
            contractAddress: rouletteAddress,
            privateStateId: CLAIRE_ROULETTE_PRIVATE_ID,
            circuitId: 'betColor',
            args: [chip, Color.BLACK],
        });

        const state = await queryRoulette();
        expect(state.betCoins.size()).toEqual(2n);
    });

    it('Alice reveals the winning number (RED)', async () => {
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
        expect(state.color).toEqual(Color.RED);
    });

    it('Bob claims his bet back (phase 1: claimMyBet → 1x)', async () => {
        expect(await chipBalance(bobWallet)).toEqual(0n);

        await (submitCallTx<RouletteContract, 'claimMyBet'>)(bobRouletteProv, {
            compiledContract: CompiledRouletteContract,
            contractAddress: rouletteAddress,
            privateStateId: BOB_ROULETTE_PRIVATE_ID,
            circuitId: 'claimMyBet',
        });

        await syncWallet(logger, bobWallet.wallet, 600_000);
        const bobAfter1 = await chipBalance(bobWallet);
        logger.info(`Bob chip balance after claimMyBet: ${bobAfter1}`);
        expect(bobAfter1).toEqual(BET_SIZE);

        const state = await queryRoulette();
        expect(state.winnerList.size()).toEqual(1n);
        // Bob's betCoins entry is intentionally kept until claimMatch so that
        // circuit can verify match.value == bet.value. Claire's entry is also
        // still here (she lost, will be swept by houseClaimBet).
        expect(state.betCoins.size()).toEqual(2n);
    });

    it('Bob claims a match coin (phase 2: claimMatch → total 2x)', async () => {
        const matchKey = await pickMatchKeyOfValue(BET_SIZE);
        logger.info(`Bob claiming match with key=${Buffer.from(matchKey).toString('hex')}`);

        await (submitCallTx<RouletteContract, 'claimMatch'>)(bobRouletteProv, {
            compiledContract: CompiledRouletteContract,
            contractAddress: rouletteAddress,
            privateStateId: BOB_ROULETTE_PRIVATE_ID,
            circuitId: 'claimMatch',
            args: [matchKey],
        });

        await syncWallet(logger, bobWallet.wallet, 600_000);
        const bobAfter2 = await chipBalance(bobWallet);
        logger.info(`Bob chip balance after claimMatch: ${bobAfter2}`);
        expect(bobAfter2).toEqual(2n * BET_SIZE);

        const state = await queryRoulette();
        expect(state.matchedWinners.size()).toEqual(1n);
        expect(state.houseCoins.size()).toEqual(1n); // one match left
        // Bob's bet record was removed by claimMatch (after the value check).
        expect(state.betCoins.size()).toEqual(1n); // only Claire's loser record left
    });

    it('Alice sweeps Claire\'s bet coin via houseClaimBet', async () => {
        expect(await chipBalance(aliceWallet)).toEqual(0n);

        const loserPseudo = await findLoserPseudonym();
        logger.info(`Alice sweeping loser=${Buffer.from(loserPseudo).toString('hex')}`);

        await (submitCallTx<RouletteContract, 'houseClaimBet'>)(aliceRouletteProv, {
            compiledContract: CompiledRouletteContract,
            contractAddress: rouletteAddress,
            privateStateId: ALICE_ROULETTE_PRIVATE_ID,
            circuitId: 'houseClaimBet',
            args: [loserPseudo],
        });

        await syncWallet(logger, aliceWallet.wallet, 600_000);
        const aliceAfter1 = await chipBalance(aliceWallet);
        logger.info(`Alice chip balance after sweeping bet: ${aliceAfter1}`);
        expect(aliceAfter1).toEqual(BET_SIZE);

        const state = await queryRoulette();
        expect(state.betCoins.size()).toEqual(0n);
    });

    it('Alice sweeps the remaining unused match coin via houseClaimMatch', async () => {
        const matchKey = await pickMatchKeyOfValue(BET_SIZE);
        logger.info(`Alice sweeping match=${Buffer.from(matchKey).toString('hex')}`);

        await (submitCallTx<RouletteContract, 'houseClaimMatch'>)(aliceRouletteProv, {
            compiledContract: CompiledRouletteContract,
            contractAddress: rouletteAddress,
            privateStateId: ALICE_ROULETTE_PRIVATE_ID,
            circuitId: 'houseClaimMatch',
            args: [matchKey],
        });

        await syncWallet(logger, aliceWallet.wallet, 600_000);
        const aliceAfter2 = await chipBalance(aliceWallet);
        logger.info(`Alice chip balance after sweeping match: ${aliceAfter2}`);
        expect(aliceAfter2).toEqual(2n * BET_SIZE);

        const state = await queryRoulette();
        expect(state.houseCoins.size()).toEqual(0n);
    });

    it('Claire cannot claim — she bet BLACK but the winning color was RED', async () => {
        await expect(async () => {
            await (submitCallTx<RouletteContract, 'claimMyBet'>)(claireRouletteProv, {
                compiledContract: CompiledRouletteContract,
                contractAddress: rouletteAddress,
                privateStateId: CLAIRE_ROULETTE_PRIVATE_ID,
                circuitId: 'claimMyBet',
            });
        }).rejects.toThrow();

        expect(await chipBalance(claireWallet)).toEqual(0n);
    });
});
