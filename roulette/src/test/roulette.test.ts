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
    Thirds,
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

describe('Roulette + shielded chips: multi-bet, claim, and house sweep', () => {
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

    // Captured betIds from each bet call so the corresponding claim / sweep
    // calls know which entry to settle.
    const bobWinningBetIds: Uint8Array[] = [];
    const bobLosingBetIds: Uint8Array[] = [];
    const claireLosingBetIds: Uint8Array[] = [];

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
    // With winningNum=10 the contract resolves:
    //   color=BLACK, third=FIRST (10 ≤ 12), bigSmall=SMALL,
    //   evenOdd=ODD (legacy quirk — see roulette.compact:revealWinningNumber).
    // Bob's bets are picked so two win and one loses; Claire's both lose.

    const CHIP_DENOM = 50n;
    const BOB_CHIP_COUNT = 3;
    const CLAIRE_CHIP_COUNT = 2;

    const aliceSk = new Uint8Array(randomBytes(32));
    const bobSk = new Uint8Array(randomBytes(32));
    const claireSk = new Uint8Array(randomBytes(32));

    async function queryRoulette() {
        const state =
            await aliceRouletteProv.publicDataProvider.queryContractState(rouletteAddress);
        expect(state).not.toBeNull();
        return rouletteLedger(state!.data);
    }

    // Pull a single chip UTXO out of a wallet's pool. Spent coins disappear
    // from availableCoins after the next sync, so callers must sync between
    // bets to avoid grabbing the same UTXO twice.
    async function takeChipCoin(
        walletProvider: MidnightWalletProvider,
        label: string,
    ): Promise<ShieldedCoinArg> {
        const facadeState = await walletProvider.wallet.waitForSyncedState();
        const allCoins = facadeState.shielded.availableCoins;
        const chips = allCoins.filter((c) => c.coin.type === chipColorHex);
        logger.info(
            `[${label}] availableCoins=${allCoins.length}, chipUTXOs=${chips.length}, ` +
            `nonces=[${chips.map((c) => c.coin.nonce.slice(0, 8)).join(',')}], ` +
            `values=[${chips.map((c) => c.coin.value.toString()).join(',')}]`,
        );
        const chip = chips[0];
        if (!chip) {
            const seen = allCoins.map((c) => c.coin.type).join(', ');
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

    async function chipBalance(walletProvider: MidnightWalletProvider): Promise<bigint> {
        const facadeState = await walletProvider.wallet.waitForSyncedState();
        return facadeState.shielded.balances[chipColorHex] ?? 0n;
    }

    async function logDust(label: string, walletProvider: MidnightWalletProvider): Promise<void> {
        const facadeState = await walletProvider.wallet.waitForSyncedState();
        const dustBal = facadeState.dust.balance(new Date());
        logger.info(`[${label}] dust balance: ${dustBal}`);
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

    it('Alice mints multiple chip coins to Bob and Claire', async () => {
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

        const encMap = new Map<string, string>([
            [bobCoinPk, bobWallet.getEncryptionPublicKey()],
            [claireCoinPk, claireWallet.getEncryptionPublicKey()],
        ]);

        // Mint one CHIP_DENOM coin per intended bet so each bet can spend a
        // distinct shielded UTXO. (The wallet would otherwise need to split a
        // single fat coin, which complicates multi-bet UX in tests.)
        for (let i = 0; i < BOB_CHIP_COUNT; i++) {
            logger.info(`Alice minting ${CHIP_DENOM} chips to Bob (${i + 1}/${BOB_CHIP_COUNT})`);
            await (submitCallTx<ChipsContract, 'mint'>)(aliceChipsProv, {
                compiledContract: CompiledChipsContract,
                contractAddress: chipsAddress,
                privateStateId: ALICE_CHIPS_PRIVATE_ID,
                circuitId: 'mint',
                args: [bobCoinPkBytes, CHIP_DENOM],
                additionalCoinEncPublicKeyMappings: encMap,
            });
        }
        for (let i = 0; i < CLAIRE_CHIP_COUNT; i++) {
            logger.info(`Alice minting ${CHIP_DENOM} chips to Claire (${i + 1}/${CLAIRE_CHIP_COUNT})`);
            await (submitCallTx<ChipsContract, 'mint'>)(aliceChipsProv, {
                compiledContract: CompiledChipsContract,
                contractAddress: chipsAddress,
                privateStateId: ALICE_CHIPS_PRIVATE_ID,
                circuitId: 'mint',
                args: [claireCoinPkBytes, CHIP_DENOM],
                additionalCoinEncPublicKeyMappings: encMap,
            });
        }

        const chipsState =
            await aliceChipsProv.publicDataProvider.queryContractState(chipsAddress);
        expect(chipsState).not.toBeNull();
        const ledger = chipsLedger(chipsState!.data);
        chipColorBytes = ledger.tokenColor;
        chipColorHex = decodeRawTokenType(chipColorBytes);
        logger.info(`Chip token color: ${chipColorHex}`);

        await syncWallet(logger, bobWallet.wallet, 600_000);
        await syncWallet(logger, claireWallet.wallet, 600_000);
        expect(await chipBalance(bobWallet)).toEqual(CHIP_DENOM * BigInt(BOB_CHIP_COUNT));
        expect(await chipBalance(claireWallet)).toEqual(CHIP_DENOM * BigInt(CLAIRE_CHIP_COUNT));
        // Alice never minted to herself.
        expect(await chipBalance(aliceWallet)).toEqual(0n);
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
    });

    it('Bob places three bets (number, color, color) and captures their betIds', async () => {
        const bobPS = createRoulettePrivateState(bobSk);
        bobRouletteProv.privateStateProvider.setContractAddress(rouletteAddress);
        await bobRouletteProv.privateStateProvider.set(BOB_ROULETTE_PRIVATE_ID, bobPS);
        await logDust('bob-before-bets', bobWallet);
        await logDust('alice-before-bets', aliceWallet);
        await logDust('claire-before-bets', claireWallet);

        // Winning bet: betNumber(10) — exact match on the revealed number.
        {
            const chip = await takeChipCoin(bobWallet, "bob");
            logger.info(`Bob bet #1: number=${WINNING_NUMBER}`);
            const tx = await (submitCallTx<RouletteContract, 'betNumber'>)(bobRouletteProv, {
                compiledContract: CompiledRouletteContract,
                contractAddress: rouletteAddress,
                privateStateId: BOB_ROULETTE_PRIVATE_ID,
                circuitId: 'betNumber',
                args: [chip, WINNING_NUMBER],
            });
            const betId = tx.private.result;
            logger.info(`  betId=${Buffer.from(betId).toString('hex')}`);
            bobWinningBetIds.push(betId);
            await syncWallet(logger, bobWallet.wallet, 600_000);
        }

        // Winning bet: betColor(BLACK) — 10 is even and non-zero → BLACK.
        {
            const chip = await takeChipCoin(bobWallet, "bob");
            logger.info(`Bob bet #2: color=BLACK`);
            const tx = await (submitCallTx<RouletteContract, 'betColor'>)(bobRouletteProv, {
                compiledContract: CompiledRouletteContract,
                contractAddress: rouletteAddress,
                privateStateId: BOB_ROULETTE_PRIVATE_ID,
                circuitId: 'betColor',
                args: [chip, Color.BLACK],
            });
            const betId = tx.private.result;
            logger.info(`  betId=${Buffer.from(betId).toString('hex')}`);
            bobWinningBetIds.push(betId);
            await syncWallet(logger, bobWallet.wallet, 600_000);
        }

        // Losing bet: betColor(RED) — wrong color.
        {
            const chip = await takeChipCoin(bobWallet, "bob");
            logger.info(`Bob bet #3: color=RED (intentionally losing)`);
            const tx = await (submitCallTx<RouletteContract, 'betColor'>)(bobRouletteProv, {
                compiledContract: CompiledRouletteContract,
                contractAddress: rouletteAddress,
                privateStateId: BOB_ROULETTE_PRIVATE_ID,
                circuitId: 'betColor',
                args: [chip, Color.RED],
            });
            const betId = tx.private.result;
            logger.info(`  betId=${Buffer.from(betId).toString('hex')}`);
            bobLosingBetIds.push(betId);
            await syncWallet(logger, bobWallet.wallet, 600_000);
        }

        const state = await queryRoulette();
        expect(state.betCount).toEqual(3n);
        expect(state.bets.size()).toEqual(3n);
        expect(await chipBalance(bobWallet)).toEqual(0n);
    });

    it('Claire places two losing bets (color RED, thirds THIRD)', async () => {
        const clairePS = createRoulettePrivateState(claireSk);
        claireRouletteProv.privateStateProvider.setContractAddress(rouletteAddress);
        await claireRouletteProv.privateStateProvider.set(CLAIRE_ROULETTE_PRIVATE_ID, clairePS);

        {
            const chip = await takeChipCoin(claireWallet, "claire");
            logger.info('Claire bet #1: color=RED (intentionally losing)');
            const tx = await (submitCallTx<RouletteContract, 'betColor'>)(claireRouletteProv, {
                compiledContract: CompiledRouletteContract,
                contractAddress: rouletteAddress,
                privateStateId: CLAIRE_ROULETTE_PRIVATE_ID,
                circuitId: 'betColor',
                args: [chip, Color.RED],
            });
            claireLosingBetIds.push(tx.private.result);
            await syncWallet(logger, claireWallet.wallet, 600_000);
        }

        // 10 is in the FIRST third (≤ 12), so a THIRD bet loses.
        {
            const chip = await takeChipCoin(claireWallet, "claire");
            logger.info('Claire bet #2: thirds=THIRD (intentionally losing)');
            const tx = await (submitCallTx<RouletteContract, 'betThirds'>)(claireRouletteProv, {
                compiledContract: CompiledRouletteContract,
                contractAddress: rouletteAddress,
                privateStateId: CLAIRE_ROULETTE_PRIVATE_ID,
                circuitId: 'betThirds',
                args: [chip, Thirds.THIRD],
            });
            claireLosingBetIds.push(tx.private.result);
            await syncWallet(logger, claireWallet.wallet, 600_000);
        }

        const state = await queryRoulette();
        expect(state.betCount).toEqual(5n);
        expect(state.bets.size()).toEqual(5n);
        expect(await chipBalance(claireWallet)).toEqual(0n);
    });

    it('Blocks Alice (the house) from placing a bet', async () => {
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
        expect(state.color).toEqual(Color.BLACK);
        expect(state.third).toEqual(Thirds.FIRST);
    });

    it('Bob claims both winning bets and recovers his chips', async () => {
        expect(await chipBalance(bobWallet)).toEqual(0n);

        for (const betId of bobWinningBetIds) {
            logger.info(`Bob claims betId=${Buffer.from(betId).toString('hex')}`);
            await (submitCallTx<RouletteContract, 'claimWin'>)(bobRouletteProv, {
                compiledContract: CompiledRouletteContract,
                contractAddress: rouletteAddress,
                privateStateId: BOB_ROULETTE_PRIVATE_ID,
                circuitId: 'claimWin',
                args: [betId],
            });
        }

        await syncWallet(logger, bobWallet.wallet, 600_000);
        expect(await chipBalance(bobWallet)).toEqual(
            CHIP_DENOM * BigInt(bobWinningBetIds.length),
        );

        // Only Bob's losing bet and Claire's two losing bets remain on-chain.
        const state = await queryRoulette();
        expect(state.bets.size()).toEqual(
            BigInt(bobLosingBetIds.length + claireLosingBetIds.length),
        );
    });

    it('Bob cannot reclaim a settled bet', async () => {
        const settled = bobWinningBetIds[0]!;
        await expect(async () => {
            await (submitCallTx<RouletteContract, 'claimWin'>)(bobRouletteProv, {
                compiledContract: CompiledRouletteContract,
                contractAddress: rouletteAddress,
                privateStateId: BOB_ROULETTE_PRIVATE_ID,
                circuitId: 'claimWin',
                args: [settled],
            });
        }).rejects.toThrow();
    });

    it('Claire cannot claim her losing bets', async () => {
        for (const betId of claireLosingBetIds) {
            await expect(async () => {
                await (submitCallTx<RouletteContract, 'claimWin'>)(claireRouletteProv, {
                    compiledContract: CompiledRouletteContract,
                    contractAddress: rouletteAddress,
                    privateStateId: CLAIRE_ROULETTE_PRIVATE_ID,
                    circuitId: 'claimWin',
                    args: [betId],
                });
            }).rejects.toThrow();
        }
        expect(await chipBalance(claireWallet)).toEqual(0n);
    });

    it('A non-house caller cannot sweep losses', async () => {
        const someLoss = claireLosingBetIds[0]!;
        await expect(async () => {
            await (submitCallTx<RouletteContract, 'sweepLoss'>)(bobRouletteProv, {
                compiledContract: CompiledRouletteContract,
                contractAddress: rouletteAddress,
                privateStateId: BOB_ROULETTE_PRIVATE_ID,
                circuitId: 'sweepLoss',
                args: [someLoss],
            });
        }).rejects.toThrow();
    });

    it('Alice cannot sweep a winning bet', async () => {
        // bobWinningBetIds[0] has been claimed by Bob already so it's gone
        // from `bets`. Attempt a sweep against the (now-removed) entry: the
        // "Unknown or already-settled bet" branch should reject.
        const claimed = bobWinningBetIds[0]!;
        await expect(async () => {
            await (submitCallTx<RouletteContract, 'sweepLoss'>)(aliceRouletteProv, {
                compiledContract: CompiledRouletteContract,
                contractAddress: rouletteAddress,
                privateStateId: ALICE_ROULETTE_PRIVATE_ID,
                circuitId: 'sweepLoss',
                args: [claimed],
            });
        }).rejects.toThrow();
    });

    it('Alice sweeps all losing bets to her own wallet', async () => {
        const aliceBefore = await chipBalance(aliceWallet);
        expect(aliceBefore).toEqual(0n);

        const allLosses = [...bobLosingBetIds, ...claireLosingBetIds];
        for (const betId of allLosses) {
            logger.info(`Alice sweeps betId=${Buffer.from(betId).toString('hex')}`);
            await (submitCallTx<RouletteContract, 'sweepLoss'>)(aliceRouletteProv, {
                compiledContract: CompiledRouletteContract,
                contractAddress: rouletteAddress,
                privateStateId: ALICE_ROULETTE_PRIVATE_ID,
                circuitId: 'sweepLoss',
                args: [betId],
            });
        }

        await syncWallet(logger, aliceWallet.wallet, 600_000);
        expect(await chipBalance(aliceWallet)).toEqual(
            CHIP_DENOM * BigInt(allLosses.length),
        );

        // All bets settled.
        const state = await queryRoulette();
        expect(state.bets.size()).toEqual(0n);
        expect(state.betCoins.size()).toEqual(0n);
        // betCount is monotonic — it records total bets ever placed.
        expect(state.betCount).toEqual(5n);
    });

});
