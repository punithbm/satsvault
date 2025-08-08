import { ethers } from "ethers";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();
import { signMessage } from "../../utils/signgen";

const API_URL = process.env.EVM_RPC;

const provider = new ethers.JsonRpcProvider(API_URL);

async function getNonce(address: string) {
    const nonce = await provider.getTransactionCount(address);
    return nonce;
}

async function getGasPrice() {
    const gasPrice = (await provider.getFeeData()).gasPrice;
    return gasPrice;
}

function doubleSha256(buffer) {
    return crypto
        .createHash("sha256")
        .update(crypto.createHash("sha256").update(buffer).digest())
        .digest();
}


async function ethSendTransaction(
    fromAddress: string,
    toAddress: string,
    amount: string
) {
    const nonce = await getNonce(fromAddress);
    const gasPrice = await getGasPrice();
    
    const transaction = {
        to: toAddress,
        value: 1,
        gasLimit: 21000,
        gasPrice: gasPrice,
        nonce: nonce,
        chainId: 262145
    };

    const tx = ethers.Transaction.from(transaction);

    const keyId = process.env.EVM_CONTRACT_KEY_ID;


    console.log("tx.unsignedHash", tx.unsignedHash);
    
    const signature = await signMessage(keyId, tx.unsignedHash);

    // Try both recovery IDs and verify which one recovers the correct address
    const recoveryIds = ['1b', '1c'];
    let correctSignature: string | null = null;
    let recoveredAddress: string | null = null;

    for (const recoveryId of recoveryIds) {
        const testSig = signature.signature.slice(0, -2) + recoveryId;
        try {
            const testTx = ethers.Transaction.from({
                ...transaction,
                signature: testSig
            });
            const recovered = testTx.from;
            
            if (recovered && recovered.toLowerCase() === fromAddress.toLowerCase()) {
                correctSignature = testSig;
                recoveredAddress = recovered;
                console.log(`Signature verified: recovered address ${recovered} matches expected ${fromAddress}`);
                break;
            }
        } catch (error) {
            console.log(`Failed to recover address with recovery ID ${recoveryId}:`, error.message);
        }
    }

    if (!correctSignature) {
        throw new Error(`Failed to recover correct address from signature. Expected: ${fromAddress}`);
    }

    const signedTransaction = ethers.Transaction.from({
        ...transaction,
        signature: correctSignature
    }).serialized;
    
    try {
        const txResponse = await provider.broadcastTransaction(signedTransaction);
        console.log(`Transaction broadcast successfully. Recovered address: ${recoveredAddress}, Tx hash:`, txResponse.hash);
        return txResponse;
    } catch (error) {
        console.error('Broadcast error details:', {
            message: error.message,
            code: error.code,
            data: error.data,
            signature: correctSignature,
            recoveredAddress: recoveredAddress,
            originalSignature: signature.signature
        });
        throw error;
    }
}


export { getNonce, getGasPrice, ethSendTransaction, doubleSha256, provider };
