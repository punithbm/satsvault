declare module "@unisat/wallet-utils" {
    export function verifyMessage(
        pubkey: string,
        message: string,
        signature: string
    ): boolean;
}
