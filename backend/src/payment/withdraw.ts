import { hashMessage } from "@ethersproject/hash";
import { ethers } from "ethers";
import { ErrorDecoder } from "ethers-decode-error";
import crypto from "crypto";
import { HANDLER_CONTRACT_ABI, HANDLER_CONTRACT_ADDRESS } from "../blockchain/evm/abi/handler";
import { getNonce, provider } from "../blockchain/evm/evmUtils";
import { signTransaction, sendSignedTransaction } from "../blockchain/evm/evmCallerUtils";
import { getMappings } from "../database/mappings";
import { signMessage } from "../utils/signgen";
import { btcToSats } from "../blockchain/btc/btcUtils";
import { btcSendTransaction } from "../blockchain/btc/btcTransaction";
import { logUserExternalTx } from "../services/logUserExternalTx";

const errorDecoder = ErrorDecoder.create();

async function withdraw(bitcoinAddress: string, amount: number, nonce?: number) {
    try {
        const address = process.env.EVM_CONTRACT_OWNER_ADDRESS;
        const mappings = await getMappings();
        const mapping = mappings.find((m) => m.btcaddress === bitcoinAddress);
        
        const unsignedTx = await createUnsignedTransaction(
            address,
            bitcoinAddress,
            amount,
            mapping,
            nonce
        );
        console.log({unsignedTx});
        const signedTx = await signTransaction(
            unsignedTx,
            process.env.EVM_CONTRACT_KEY_ID
        );
        console.log({signedTx});
        const res = await sendSignedTransaction(signedTx);
        console.log("Withdrawal successful:", res);
        const response = await btcSendTransaction({
            fromAddress: process.env.VAULT_ADDRESS,
            toAddress: bitcoinAddress,
            amount: btcToSats(amount),
            pubkey: process.env.VAULT_MPC_PUBLIC_KEY,
            keyId: process.env.VAULT_MPC_KEY_ID
        });
        console.log("btc transaction hash", response);
        const amountSats = btcToSats(amount);
        const exData = {
            evmAddress: mapping?.evmaddress,
            type: 3,
            txid: "0x" + response,
            amount: amountSats,
            bitcoinAddressHash: mapping?.btcaddresshash
        };
        const logUserExternalTxRes = logUserExternalTx(exData, nonce);
        return { status: true, data: response };
    } catch (err) {
        const { reason } = await errorDecoder.decode(err);
        if (
            reason.includes("nonce too low") ||
            err.toString().includes("invalid nonce")
        ) {
            let nonce = await getNonce(process.env.EVM_CONTRACT_OWNER_ADDRESS);
            console.log({ incremented: nonce });
            // nonce = nonce + 1;
            return await withdraw(bitcoinAddress, amount, nonce);
        } else {
            console.error("Error withdrawing:", err);
            return { status: false, data: "" };
        }
    }
}

async function createUnsignedTransaction(
    signerAddress: string,
    bitcoinAddress: string,
    amount: number,
    mapping: any,
    nonceInc?: number
) {
    const contract = new ethers.Contract(
        HANDLER_CONTRACT_ADDRESS,
        HANDLER_CONTRACT_ABI,
        provider
    );
    const btcAddressHash = mapping?.btcaddresshash;
    const message = `${btcAddressHash + mapping?.evmaddress}`;
    const evmAddress = mapping?.evmaddress;
    const hashedMsg = '0x'+crypto.createHash("sha256").update(message).digest("hex");
    const signature = await signMessage(mapping?.evmkeyid, hashedMsg, 4, "ecdsa", evmAddress);
    const nonce = nonceInc ? nonceInc : await getNonce(signerAddress);
    const signatureBytes = ethers.getBytes(signature.signature);
    const amountSats = btcToSats(amount);
    console.log({
        btcAddressHash,
        signatureBytes,
        hashedMsg,
        evmAddress,
        amountSats
    });
    const unsignedTx = await contract.withdraw.populateTransaction(
        btcAddressHash,
        signatureBytes,
        hashedMsg,
        evmAddress,
        amountSats
    );
    console.log({unsignedTx});
    //@ts-ignore
    unsignedTx.chainId = Number(process.env.EVM_CHAIN_ID);
    unsignedTx.nonce = nonce;
    //@ts-ignore
    unsignedTx.gasLimit = 200000;
    return unsignedTx;
}

export { withdraw };
