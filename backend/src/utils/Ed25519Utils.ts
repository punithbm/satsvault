import * as ed from "@noble/ed25519";
import { etc } from "@noble/ed25519";

export const verifyEd25519Signature = async (
    message: string,
    signatureHex: string,
    publicKeyHex: string
): Promise<boolean> => {
    const messageBytes = new TextEncoder().encode(message);
    const signature = etc.hexToBytes(signatureHex);
    const publicKey = etc.hexToBytes(publicKeyHex);
    const isValid = ed.verify(signature, messageBytes, publicKey);
    return isValid;
};
