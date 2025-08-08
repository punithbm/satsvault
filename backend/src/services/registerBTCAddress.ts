import { ethers } from "ethers";
import { ErrorDecoder } from "ethers-decode-error";
import crypto from "crypto";
import { HANDLER_CONTRACT_ABI, HANDLER_CONTRACT_ADDRESS } from "../blockchain/evm/abi/handler";
import { getNonce, getGasPrice, provider } from "../blockchain/evm/evmUtils";
import { signTransaction, sendSignedTransaction } from "../blockchain/evm/evmCallerUtils";
import { getMappings } from "../database/mappings";
import { signMessage } from "../utils/signgen";
import { bytes32BTC } from "../blockchain/btc/btcUtils";
import { arrayify, hexZeroPad } from "@ethersproject/bytes";
import { intToHex } from "@ethereumjs/util";

const errorDecoder = ErrorDecoder.create();

async function registerBTCAddress(btcAddress: string, mapping: any, nonce?: number) {
    try {
        const address = process.env.EVM_CONTRACT_OWNER_ADDRESS;
        const unsignedTx = await createUnsignedTransaction(
            address.toLowerCase(),
            btcAddress,
            mapping,
            nonce
        );
        const signedTx = await signTransaction(
            unsignedTx,
            process.env.EVM_CONTRACT_KEY_ID
        );
        const res = await sendSignedTransaction(signedTx);
        console.log("registerBTCAddress", res);
        return { status: true, data: res };
    } catch (err) {
        const { reason } = await errorDecoder.decode(err);
        console.log({reason})
        if (
            reason.includes("nonce too low") ||
            err.toString().includes("invalid nonce")
        ) {
            let nonceByAddress = await getNonce(process.env.EVM_CONTRACT_OWNER_ADDRESS);
            console.log({nonceByAddress});
            let nonceLatest =nonce ? nonce + 1 : 1;
            console.log({nonceLatest});
            return await registerBTCAddress(btcAddress, mapping, nonceLatest);
        } else {
        }
        console.error("Error registering btc address:", err);
    }
}

async function createUnsignedTransaction(
    signerAddress: string,
    btcAddress: string,
    mapping: any,
    nonceInc?: number
) {
    const contract = new ethers.Contract(
        HANDLER_CONTRACT_ADDRESS,
        HANDLER_CONTRACT_ABI,
        provider
    );
    const btcAddressHash = await bytes32BTC(btcAddress);
    const evmAddress = mapping.evmAddress;
    const message = `${btcAddressHash + evmAddress}`;
    const hashedMessage = '0x'+crypto.createHash("sha256").update(message).digest("hex");
    const signature = await signMessage(mapping.evmKeyId, hashedMessage,  Number(process.env.THRESHOLD), "ecdsa", evmAddress);
    const sig = signature.signature;
    const nonce = nonceInc ? nonceInc : await getNonce(signerAddress);
    const signatureBytes = ethers.getBytes(sig);
    const unsignedTx = await contract.registerUser.populateTransaction(
        evmAddress.toLowerCase(),
        signatureBytes,
        btcAddressHash,
        hashedMessage
    );
    //@ts-ignore
    unsignedTx.chainId = Number(process.env.EVM_CHAIN_ID);
    unsignedTx.nonce = nonce;
    //@ts-ignore
    unsignedTx.gasLimit = 200000;
    return unsignedTx;
}

//Verify evm signature against message
function recoverAddress(message: string, signature: string) {
    try {
        const recoveredAddress = ethers.recoverAddress(message, signature);
        return recoveredAddress;
    } catch (error) {
        console.error("Error recovering address:", error);
        return null;
    }
}

export { registerBTCAddress };
