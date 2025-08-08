import { serialize } from "@ethersproject/transactions";
import { splitSignature, hexZeroPad } from "@ethersproject/bytes";
import { handleSignGen } from "../../../mpc/index.js";
import { provider } from "../evm/evmUtils.js";
import { SignAlgo } from "../../../mpc/config/index.js";
import { signMessage } from "../../utils/signgen";

// Address type detection utility
const getAddressType = (address: string): 'P2WPKH' | 'P2TR' | 'UNKNOWN' => {
    if (address.startsWith('tb1q') || address.startsWith('bc1q')) {
        return 'P2WPKH';
    } else if (address.startsWith('tb1p') || address.startsWith('bc1p')) {
        return 'P2TR';
    }
    return 'UNKNOWN';
};

async function signBTCTransaction(serializedPreSignedTx, keyId) {
    // Determine the address type based on environment variables
    // Check if we're signing for VAULT (Taproot) or FAUCET (P2WPKH)
    const vaultKeyId = process.env.VAULT_MPC_KEY_ID;
    const faucetKeyId = process.env.FAUCET_MPC_KEY_ID;
    const vaultAddress = process.env.VAULT_ADDRESS;
    const faucetAddress = process.env.FAUCET_ADDRESS;
    
    let signAlgo = SignAlgo.Ecdsa; // Default to ECDSA for P2WPKH
    let hashFn = "Sha256D"; // Default hash function
    
    console.log(`=== SIGNING DEBUG INFO ===`);
    console.log(`KeyId: ${keyId}`);
    console.log(`VaultKeyId: ${vaultKeyId}`);
    console.log(`FaucetKeyId: ${faucetKeyId}`);
    console.log(`VaultAddress: ${vaultAddress}`);
    console.log(`FaucetAddress: ${faucetAddress}`);
    
    // Determine which address/key we're using
    if (keyId === vaultKeyId && vaultAddress) {
        const addressType = getAddressType(vaultAddress);
        console.log(`Detected VAULT address type: ${addressType}`);
        
        if (addressType === 'P2TR') {
            signAlgo = SignAlgo.Taproot;
            hashFn = "RawMessage"; // Taproot uses raw Schnorr signatures
        } else if (addressType === 'P2WPKH') {
            signAlgo = SignAlgo.Ecdsa;
            hashFn = "Sha256D"; // P2WPKH uses ECDSA with double SHA256
        }
        console.log(`Signing for VAULT (${addressType}): ${vaultAddress}`);
    } else if (keyId === faucetKeyId && faucetAddress) {
        const addressType = getAddressType(faucetAddress);
        console.log(`Detected FAUCET address type: ${addressType}`);
        
        if (addressType === 'P2WPKH') {
            signAlgo = SignAlgo.Ecdsa;
            hashFn = "Sha256D"; // P2WPKH uses ECDSA with double SHA256
        } else if (addressType === 'P2TR') {
            signAlgo = SignAlgo.Taproot;
            hashFn = "RawMessage"; // Taproot uses raw Schnorr signatures
        }
        console.log(`Signing for FAUCET (${addressType}): ${faucetAddress}`);
    } else {
        console.log(`Unknown keyId: ${keyId}, defaulting to ECDSA`);
    }
    
    console.log(`Using signing algorithm: ${signAlgo} with hash function: ${hashFn}`);
    console.log(`Hash to sign: ${serializedPreSignedTx}`);
    
    let signature = await signMessage(
        keyId,
        serializedPreSignedTx,
        Number(process.env.THRESHOLD),
        'schnorr'
    );
    console.log(`Generated signature result:`, signature);
    return {sign: signature.signature};
}

export { signBTCTransaction };