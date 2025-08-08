import { ethers } from "ethers";
import { ErrorDecoder } from "ethers-decode-error";

import { HANDLER_CONTRACT_ABI, HANDLER_CONTRACT_ADDRESS } from "../blockchain/evm/abi/handler";
import { getNonce, provider } from "../blockchain/evm/evmUtils";
import { signTransaction, sendSignedTransaction } from "../blockchain/evm/evmCallerUtils";
import { btcToSats } from "../blockchain/btc/btcUtils";
import { updateAddressMapping } from "../database/supabase";
import { logUserExternalTx } from "../services/logUserExternalTx";
import { getAddressMapping } from "../database/mappings";

const errorDecoder = ErrorDecoder.create();

async function transferAmount(
    fromAddress: string,
    toAddress: string,
    amount: number,
    evmAddress: string,
    toAddressHash: string,
    mappings: any[],
    fromAddressHash: string,
    nonce?: number
) {
    try {
        const address = process.env.EVM_CONTRACT_OWNER_ADDRESS;
        const unsignedTx = await createUnsignedTransaction(
            address,
            fromAddress,
            toAddress,
            amount,
            evmAddress,
            mappings,
            fromAddressHash,
            toAddressHash,
            nonce
        );
        const signedTx = await signTransaction(
            unsignedTx,
            process.env.EVM_CONTRACT_KEY_ID
        );
        const res = await sendSignedTransaction(signedTx);
        console.log("Send transaction response", res);
        const amountInt = parseInt(btcToSats(amount).toString());
        const exData = {
            evmAddress,
            type: 1,
            txid: res.hash,
            amount: amountInt,
            bitcoinAddressHash: toAddressHash
        };
        console.log("External transaction data", exData);
        const logUserExternalTxRes = await logUserExternalTx(exData, nonce);
        console.log("logUserExternalTx success", logUserExternalTxRes);
        return { status: true, data: res };
    } catch (err) {
        const { reason } = await errorDecoder.decode(err);
        if (
            reason.includes("nonce too low") ||
            err.toString().includes("invalid nonce")
        ) {
            // let nonce = await getNonce(process.env.EVM_CONTRACT_OWNER_ADDRESS);
            console.log({ incremented: nonce });
            // nonce = nonce + 1;
            return await transferAmount(
                fromAddress,
                toAddress,
                amount,
                evmAddress,
                toAddressHash,
                mappings,
                fromAddressHash,
                nonce
            );
        } else {
        }
        console.error("Error send btc:", err);
    }
}

async function createUnsignedTransaction(
    signerAddress: string,
    fromAddress: string,
    toAddress: string,
    amount: number,
    evmAddress: string,
    mappings: any[],
    fromAddressHash: string,
    toAddressHash: string,
    nonceInc?: number
) {
    const contract = new ethers.Contract(
        HANDLER_CONTRACT_ADDRESS,
        HANDLER_CONTRACT_ABI,
        provider
    );

    const toAddressMapping = mappings.find((m) => m.btcaddress === toAddress);

    if (!toAddressMapping) {
        const addressmappings = await getAddressMapping();
        const addressMapping = addressmappings.find((m) => m.btcaddress === toAddress);
        if (!addressMapping) {
            const mappingRes = await updateAddressMapping([
                {
                    btcAddress: toAddress,
                    btcAddressHash: toAddressHash
                }
            ]);
            if (!mappingRes?.status) {
                throw new Error("Failed to update address mapping");
            }
        }
    }

    const nonce = nonceInc ? nonceInc : await getNonce(signerAddress);

    const amountInt = parseInt(btcToSats(amount).toString());

    console.log({
        fromAddressHash,
        toAddressHash,
        amountInt,
        evmAddress
    });

    const unsignedTx = await contract.sendBTC.populateTransaction(
        fromAddressHash,
        toAddressHash,
        amountInt,
        evmAddress
    );
    //@ts-ignore
    unsignedTx.chainId = Number(process.env.EVM_CHAIN_ID);
    unsignedTx.nonce = nonce;
    //@ts-ignore
    unsignedTx.gasLimit = 200000;
    return unsignedTx;
}

export { transferAmount };
