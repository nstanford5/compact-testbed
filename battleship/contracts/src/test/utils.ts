import { encodeContractAddress } from '@midnight-ntwrk/ledger-v7';
import { encodeCoinPublicKey } from '@midnight-ntwrk/compact-runtime';

export const randomBytes = (length: number): Uint8Array => {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
}

export const startArgs = (x1: number, x2: number, sk: Uint8Array): [x1: bigint, x2: bigint, sk: Uint8Array] => {
    return [BigInt(x1), BigInt(x2), sk];
}

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