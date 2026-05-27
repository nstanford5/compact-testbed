import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { type MidnightWalletProvider } from './wallet.js';
import { type NetworkConfig } from './config.js';

// Union of all circuit IDs we call across both contracts. The provider's
// generic K is only used for type narrowing in midnight-js-types.
export type RouletteCircuits =
  | 'betColor'
  | 'betThirds'
  | 'betEvenOdd'
  | 'betBigSmall'
  | 'betNumber'
  | 'revealWinningNumber'
  | 'claimWin'
  | 'mint';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouletteProviders = MidnightProviders<any>;

// Build one provider set per (wallet, contract). The zkConfigPath must
// point at a single managed/<contract>/ directory because NodeZkConfigProvider
// resolves keys at `<directory>/keys/<circuitId>.{prover,verifier}`.
export function buildProviders(
  wallet: MidnightWalletProvider,
  zkConfigPath: string,
  config: NetworkConfig,
  storeSuffix = 'roulette',
): RouletteProviders {
  const zkConfigProvider = new NodeZkConfigProvider<RouletteCircuits>(zkConfigPath);

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: `${storeSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      privateStoragePasswordProvider: () => 'Roulette-test-password',
      accountId: wallet.getCoinPublicKey(),
    }),
    publicDataProvider: indexerPublicDataProvider(
      config.indexer,
      config.indexerWS,
    ),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(
      config.proofServer,
      zkConfigProvider,
    ),
    walletProvider: wallet,
    midnightProvider: wallet,
  };
}
