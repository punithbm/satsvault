import { ethers } from "ethers";
import { ErrorDecoder } from "ethers-decode-error";

import { HANDLER_CONTRACT_ABI, HANDLER_CONTRACT_ADDRESS } from "../blockchain/evm/abi/handler";
import { getNonce, provider } from "../blockchain/evm/evmUtils";
import { signTransaction, sendSignedTransaction } from "../blockchain/evm/evmCallerUtils";

const errorDecoder = ErrorDecoder.create();

async function processRecurringPayment(id: number, nonce?: number) {
    try {
        const address = process.env.EVM_CONTRACT_OWNER_ADDRESS;
        const unsignedTx = await createUnsignedTransaction(address, id, nonce);
        const signedTx = await signTransaction(
            unsignedTx,
            process.env.EVM_CONTRACT_KEY_ID
        );
        const res = await sendSignedTransaction(signedTx);
        console.log("Process recurring payment successful:", res);
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
            return await processRecurringPayment(nonce);
        } else {
            console.error("Error processing recurring payment:", err);
            return { status: false, data: "" };
        }
    }
}

async function createUnsignedTransaction(
    signerAddress: string,
    id: number,
    nonceInc?: number
) {
    const contract = new ethers.Contract(
        HANDLER_CONTRACT_ADDRESS,
        HANDLER_CONTRACT_ABI,
        provider
    );
    const nonce = nonceInc ? nonceInc : await getNonce(signerAddress);
    const unsignedTx = await contract.processRecurringPaymentsId.populateTransaction(id);
    //@ts-ignore
    unsignedTx.chainId = Number(process.env.EVM_CHAIN_ID);
    unsignedTx.nonce = nonce;
    //@ts-ignore
    unsignedTx.gasLimit = 200000;
    return unsignedTx;
}

export { processRecurringPayment };
