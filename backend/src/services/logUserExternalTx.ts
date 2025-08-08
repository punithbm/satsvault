import { ethers } from "ethers";
import { ErrorDecoder } from "ethers-decode-error";
import { HANDLER_CONTRACT_ABI, HANDLER_CONTRACT_ADDRESS } from "../blockchain/evm/abi/handler";
import dotenv from "dotenv";
import { getNonce, getGasPrice, provider, doubleSha256 } from "../blockchain/evm/evmUtils";
import { signTransaction, sendSignedTransaction } from "../blockchain/evm/evmCallerUtils";
import { getMappings } from "../database/mappings";
import { bytes32BTC } from "../blockchain/btc/btcUtils";
import { myEmitter } from "../api/socket";
dotenv.config();

const errorDecoder = ErrorDecoder.create();

async function logUserExternalTx(extData: any, nonce?: number) {
    try {
        const address = process.env.EVM_CONTRACT_OWNER_ADDRESS;
        const unsignedTx = await createUnsignedTransaction(extData, address, nonce);
        const signedTx = await signTransaction(
            unsignedTx,
            process.env.EVM_CONTRACT_KEY_ID
        );
        const res = await sendSignedTransaction(signedTx);
        console.log("logUserExternalTx", res);
        return res;
    } catch (err) {
        const { reason, data } = await errorDecoder.decode(err);
        console.error("error", err.toString().includes("invalid nonce"));
        console.error("Error verifying deposit:", err);
        if (
            reason.includes("nonce too low") ||
            err.toString().includes("invalid nonce")
        ) {
            let nonce = await getNonce(process.env.EVM_CONTRACT_OWNER_ADDRESS);
            console.log({ incremented: nonce });
            // nonce = nonce + 1;
            return await logUserExternalTx(extData, nonce);
        } else {
            console.log({ err });
        }
    }
}

async function createUnsignedTransaction(
    extData: any,
    signerAddress: string,
    nonceInc: number
) {
    const { evmAddress, type, txid, amount, bitcoinAddressHash } = extData;
    const contract = new ethers.Contract(
        HANDLER_CONTRACT_ADDRESS,
        HANDLER_CONTRACT_ABI,
        provider
    );
    const nonce = nonceInc ? nonceInc : await getNonce(signerAddress);
    const gasPrice = await getGasPrice();
    //@ts-ignore
    const higherGasPrice = (gasPrice * 260n) / 10n;
    console.log({
        evmAddress,
        type,
        txid,
        amount,
        bitcoinAddressHash
    });
    const unsignedTx = await contract.logUserExternalTx.populateTransaction(
        evmAddress,
        type,
        txid,
        amount,
        bitcoinAddressHash
    );
    //@ts-ignore
    unsignedTx.chainId = Number(process.env.EVM_CHAIN_ID);
    unsignedTx.nonce = nonce;
    unsignedTx.gasPrice = higherGasPrice;
    //@ts-ignore
    unsignedTx.gasLimit = 200000;
    return unsignedTx;
}

async function getEVMAddress(btcAddress: string) {
    const mappings = await getMappings();
    const mapping = mappings.find((m) => m.btcaddress === btcAddress);
    if (!mapping) {
        console.error("Mapping not found for given btc address");
        return null;
    }
    const evmAddress = mapping.evmaddress;
    return evmAddress;
}

/**
 * Decodes Ethereum transaction errors, particularly focusing on nonce-related issues
 * @param {Object} error - The error object returned by ethers.js
 * @returns {Object} Decoded error information with suggested actions
 */

export { logUserExternalTx };
