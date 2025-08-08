import { serialize } from "@ethersproject/transactions";
import { splitSignature, hexZeroPad } from "@ethersproject/bytes";
import { provider } from "./evmUtils";
import { signMessage } from "../../utils/signgen";
import { ethers, keccak256 } from "ethers";

async function signTransaction(unsignedTx, keyId) {
    const serializedPreSignedTx = serialize(unsignedTx);
    const txHash = keccak256(serializedPreSignedTx);
    const operator = process.env.EVM_CONTRACT_OWNER_ADDRESS;
    let response = await signMessage(
        keyId,
        txHash,
        Number(process.env.THRESHOLD),
        'ecdsa',
        operator
    );
    const { signature } = response;
    let _signature = signature.replace("0x", "");
    const splitSign = splitSignature({
        recoveryParam: _signature.slice(128, 130) === `1c` ? 1 : 0,
        r: hexZeroPad(`0x${_signature.slice(0, 64)}`, 32),
        s: hexZeroPad(`0x${_signature.slice(64, 128)}`, 32)
    });
    const serializedSignedTx = serialize(unsignedTx, splitSign);
    return serializedSignedTx;
}

async function sendSignedTransaction(signedTx) {
    const tx = await provider.broadcastTransaction(signedTx);
    await tx.wait();
    return tx;
}


export { signTransaction, sendSignedTransaction };
