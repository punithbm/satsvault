import { ethers } from "ethers";
import { ErrorDecoder } from "ethers-decode-error";

import { HANDLER_CONTRACT_ABI, HANDLER_CONTRACT_ADDRESS } from "../blockchain/evm/abi/handler";
import { getNonce, provider } from "../blockchain/evm/evmUtils";
import { signTransaction, sendSignedTransaction } from "../blockchain/evm/evmCallerUtils";

const errorDecoder = ErrorDecoder.create();

async function initializeHandler(nonceInc?: number) {
    try {
        const address = process.env.EVM_CONTRACT_OWNER_ADDRESS;
        const unsignedTx = await createUnsignedTransaction(address, nonceInc);
        const signedTx = await signTransaction(
            unsignedTx,
            process.env.EVM_CONTRACT_KEY_ID
        );
        const res = await sendSignedTransaction(signedTx);
        console.log("initializeHandler", res);
        return res;
    } catch (err) {
        const { reason } = await errorDecoder.decode(err);
        if (
            reason.includes("nonce too low") ||
            err.toString().includes("invalid nonce")
        ) {
            let nonce = await getNonce(process.env.EVM_CONTRACT_OWNER_ADDRESS);
            console.log({ incremented: nonce });
            // nonce = nonce + 1;
            return await initializeHandler(nonce);
        } else {
            console.log({ err });
        }
        console.error("Error initializing:", err);
    }
}

async function createUnsignedTransaction(signerAddress: string, nonceInc?: number) {
    const contract = new ethers.Contract(
        HANDLER_CONTRACT_ADDRESS,
        HANDLER_CONTRACT_ABI,
        provider
    );
    const nonce = nonceInc ? nonceInc : await getNonce(signerAddress);
    console.log({ address: signerAddress });
    const unsignedTx = await contract.initialize.populateTransaction(signerAddress);
    //@ts-ignore
    unsignedTx.chainId = Number(process.env.EVM_CHAIN_ID);
    unsignedTx.nonce = nonce;
    //@ts-ignore
    unsignedTx.gasLimit = 200000;
    return unsignedTx;
}

export { initializeHandler };
