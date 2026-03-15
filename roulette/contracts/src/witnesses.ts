
export type RoulettePrivateState = {
    betState: number,
    winningNum: bigint,
    sk: Uint8Array
};

export const createRoulettePrivateState = (betState: number, winningNum: bigint, sk: Uint8Array) => ({
    betState,
    winningNum,
    sk
});

export const witnesses = {};