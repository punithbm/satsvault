import { ethers } from "ethers";

import {
    LIGHT_CLIENT_CONTRACT_ABI,
    LIGHT_CLIENT_CONTRACT_ADDRESS
} from "../blockchain/evm/abi/lightClientAbi";
import { getNonce, getGasPrice, provider } from "../blockchain/evm/evmUtils";
import { signTransaction, sendSignedTransaction } from "../blockchain/evm/evmCallerUtils";

async function initializeBlockNumber() {
    try {
        const address = process.env.EVM_LIGHT_CONTRACT_OWNER_ADDRESS;
        console.log("address", { address });
        const unsignedTx = await createUnsignedTransaction(address);
        const signedTx = await signTransaction(
            unsignedTx,
            process.env.EVM_LIGHT_CONTRACT_OWNER_KEY_ID
        );
        const res = await sendSignedTransaction(signedTx);
        console.log("res", res);
        return res;
    } catch (error) {
        console.error("Error initializing block number:", error);
    }
}

async function createUnsignedTransaction(signerAddress) {
    const contract = new ethers.Contract(
        LIGHT_CLIENT_CONTRACT_ADDRESS,
        LIGHT_CLIENT_CONTRACT_ABI,
        provider
    );
    const nonce = await getNonce(signerAddress);
    const gasPrice = await getGasPrice();
    //@ts-ignore
    const higherGasPrice = (gasPrice * 250n) / 100n;
    const unsignedTx = await contract.initializeBlockNumber.populateTransaction(1);
    //@ts-ignore
    unsignedTx.chainId = Number(process.env.EVM_CHAIN_ID);
    unsignedTx.nonce = nonce;
    //@ts-ignore
    unsignedTx.gasLimit = 200000;
    return unsignedTx;
}

export { initializeBlockNumber };
