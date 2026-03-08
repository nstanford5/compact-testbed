import { encodeCoinPublicKey } from '@midnight-ntwrk/compact-runtime';
import { encodeContractAddress } from '@midnight-ntwrk/ledger-v7';
//import type * as Compact from '../managed/private-party/contract/index.js';

export const toHexPadded = (str: string, len = 64) => 
    Buffer.from(str, 'ascii').toString('hex').padStart(len, '0');

export const encodeToPk = (str: string): any => ({
    bytes: encodeCoinPublicKey(toHexPadded(str)),
    hex: toHexPadded(str),
});

export const encodeToAddress = (str: string): any => ({
    bytes: encodeContractAddress(toHexPadded(str)),
});

export const createEitherTestUser = (str: string) => ({
    is_left: true,
    left: encodeToPk(str),
    right: encodeToAddress(''),
});

export const randomBytes = (length: number): Uint8Array => {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
}