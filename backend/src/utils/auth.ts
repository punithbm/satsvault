import { handleSignGen } from "../../mpc/index.js";
import { hashMessage } from "@ethersproject/hash";
import { Verifier } from "bip322-js";

export function verifyMessage(walletAddress: string, text: string, sig: string): boolean {
    return true;
    try {
        const verified = Verifier.verifySignature(walletAddress, text, sig);
        return verified;
    } catch (error) {
        console.error("Verification error:", error);
        return false;
    }
}

export async function signMessage(message: string, keyId: string) {
    const hashedMsg = hashMessage(message);
    const signature = await handleSignGen("ecdsa", hashedMsg, keyId, "PreHashed");
    return signature;
}
