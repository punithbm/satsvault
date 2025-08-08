import { hashMessage } from "@ethersproject/hash";
import { ethers } from "ethers";
import { ErrorDecoder } from "ethers-decode-error";
import crypto from "crypto";
import { HANDLER_CONTRACT_ABI, HANDLER_CONTRACT_ADDRESS } from "../blockchain/evm/abi/handler";
import { getNonce, provider } from "../blockchain/evm/evmUtils";
import { signTransaction, sendSignedTransaction } from "../blockchain/evm/evmCallerUtils";
import { signMessage } from "../utils/signgen";
import { btcToSats } from "../blockchain/btc/btcUtils";
import {
    insertRecurringPaymentList,
    updateRecurringPaymentCurrStatusById
} from "../database/supabase";
import { v4 as getUUID } from "uuid";

const errorDecoder = ErrorDecoder.create();

async function setupRecurringPayment(params: any, nonce?: number) {
    try {
        console.log("params", params);
        const { fromBTCAddressHash, toBTCAddressHash, amount, frequency, label } = params;
        const currentBlock = await provider.getBlock("latest");
        const paymentBlock = Math.floor(frequency / 5 + currentBlock.number);
        const amountSats = btcToSats(amount);
        const uuid = getUUID();
        const payment = {
            fromBTCAddressHash: fromBTCAddressHash,
            toBTCAddressHash: toBTCAddressHash,
            amount: amountSats,
            frequency: frequency,
            block: paymentBlock,
            uuid: uuid,
            label: label,
            on_status: "PENDING",
            status: false
        };
        const insertRes = await insertRecurringPaymentList([payment]);
        const id = insertRes?.results?.[0].data?.[0].id;
        console.log("insertRes", insertRes.results?.[0].data);
        if (!insertRes?.status) {
            return { status: false, data: "" };
        }
        const address = process.env.EVM_CONTRACT_OWNER_ADDRESS;
        const unsignedTx = await createUnsignedTransaction(
            address,
            { ...params, id },
            nonce
        );
        const signedTx = await signTransaction(
            unsignedTx,
            process.env.EVM_CONTRACT_KEY_ID
        );
        const res = await sendSignedTransaction(signedTx);
        console.log("Recurring payment setup successful:", res);
        if (!res) {
            const updateRes = await updateRecurringPaymentCurrStatusById(
                id,
                "FAILED",
                false
            );
            if (!updateRes) {
                const updateRes = await updateRecurringPaymentCurrStatusById(
                    id,
                    "FAILED",
                    false
                );
            }
            return { status: false, data: "" };
        }
        const updateRes = await updateRecurringPaymentCurrStatusById(
            id,
            "COMPLETED",
            true
        );
        if (!updateRes) {
            return { status: false, data: "" };
        }
        return { status: true, data: res };
    } catch (err) {
        const { reason } = await errorDecoder.decode(err);
        if (
            reason.includes("nonce too low") ||
            err.toString().includes("invalid nonce")
        ) {
            let nonce = await getNonce(process.env.EVM_CONTRACT_OWNER_ADDRESS);
            console.log({ incremented: nonce });
            // nonce = nonce + 1;
            return await setupRecurringPayment(params, nonce);
        } else {
            console.error("Error setting up recurring payment:", err);
            return { status: false, data: "" };
        }
    }
}

async function createUnsignedTransaction(
    signerAddress: string,
    params: any,
    nonceInc?: number
) {
    const {
        fromBTCAddressHash,
        toBTCAddressHash,
        amount,
        frequency,
        evmAddress,
        mappings,
        fromAddress,
        id
    } = params;

    const contract = new ethers.Contract(
        HANDLER_CONTRACT_ADDRESS,
        HANDLER_CONTRACT_ABI,
        provider
    );
    const message = `${fromBTCAddressHash + evmAddress}`;
    const mapping = mappings.find((m) => m.btcaddress === fromAddress);
    if (!mapping) {
        throw new Error("Mapping not found");
    }
    const hashMessage = '0x'+crypto.createHash("sha256").update(message).digest("hex");
    const signature = await signMessage(mapping?.evmkeyid, hashMessage,  Number(process.env.THRESHOLD), "ecdsa", evmAddress);
    const nonce = nonceInc ? nonceInc : await getNonce(signerAddress);
    const signatureWithRecId = signature.signature;
    const signatureBytes = ethers.getBytes(signature.signature);
    const amountSats = btcToSats(amount);
    console.log({
        fromBTCAddressHash: fromBTCAddressHash,
        toBTCAddressHash: toBTCAddressHash,
        amount: amountSats,
        frequency: frequency,
        evmAddress: evmAddress,
        signature: signatureBytes,
        messageHash: hashMessage,
        payId: id,
        signatureWithRecId
    });
    console.log("date", Date.now());
    const unsignedTx = await contract.setupRecurringPayment.populateTransaction({
        fromBTCAddressHash: fromBTCAddressHash,
        toBTCAddressHash: toBTCAddressHash,
        amount: amountSats,
        frequency: frequency,
        // evmAddress: evmAddress,
        signature: signatureBytes,
        messageHash: hashMessage,
        payId: id
    });
    //@ts-ignore
    unsignedTx.chainId = Number(process.env.EVM_CHAIN_ID);
    unsignedTx.nonce = nonce;
    //@ts-ignore
    unsignedTx.gasLimit = 200000;
    return unsignedTx;
}

export { setupRecurringPayment };
