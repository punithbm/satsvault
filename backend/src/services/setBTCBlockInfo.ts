import { ethers } from "ethers";
import { ErrorDecoder } from "ethers-decode-error";
import {
    LIGHT_CLIENT_CONTRACT_ABI,
    LIGHT_CLIENT_CONTRACT_ADDRESS
} from "../blockchain/evm/abi/lightClientAbi";
import { getNonce, getGasPrice, provider } from "../blockchain/evm/evmUtils";
import { signTransaction, sendSignedTransaction } from "../blockchain/evm/evmCallerUtils";

const errorDecoder = ErrorDecoder.create();

async function setBlockInfo({ blockhash, rootHex }, nonce?: number) {
    try {
        const address = process.env.EVM_LIGHT_CONTRACT_OWNER_ADDRESS;
        const unsignedTx = await createUnsignedTransaction(
            blockhash,
            rootHex,
            address,
            nonce
        );
        const signedTx = await signTransaction(
            unsignedTx,
            process.env.EVM_LIGHT_CONTRACT_OWNER_KEY_ID
        );
        const res = await sendSignedTransaction(signedTx);

        return res;
    } catch (err) {
        const { reason, data } = await errorDecoder.decode(err);
        console.error("reason", reason);
        console.error("Error verifying setBlockInfo:", err.transaction);
        if (reason.includes("nonce too low")) {
            const tx = ethers.Transaction.from(err.transaction);
            const nonce = tx.nonce + 1;
            return await setBlockInfo({ blockhash, rootHex }, nonce);
        }
    }
}

async function createUnsignedTransaction(blockhash, rootHex, signerAddress, nonceInc) {
    const contract = new ethers.Contract(
        LIGHT_CLIENT_CONTRACT_ADDRESS,
        LIGHT_CLIENT_CONTRACT_ABI,
        provider
    );
    const nonce = nonceInc ? nonceInc : await getNonce(signerAddress);
    const gasPrice = await getGasPrice();
    //@ts-ignore
    const higherGasPrice = (gasPrice * 260n) / 100n;
    const unsignedTx = await contract.setBlockInfo.populateTransaction(
        blockhash,
        rootHex
    );
    //@ts-ignore
    unsignedTx.chainId = Number(process.env.EVM_CHAIN_ID);
    unsignedTx.nonce = nonce;
    unsignedTx.gasPrice = higherGasPrice;
    //@ts-ignore
    unsignedTx.gasLimit = 200000;
    return unsignedTx;
}

export { setBlockInfo };
