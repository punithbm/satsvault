import { ethers } from "ethers";
import { ErrorDecoder } from "ethers-decode-error";
import {
  HANDLER_CONTRACT_ABI,
  HANDLER_CONTRACT_ADDRESS,
} from "../blockchain/evm/abi/handler";
import dotenv from "dotenv";
import {
  getNonce,
  getGasPrice,
  provider,
  doubleSha256,
} from "../blockchain/evm/evmUtils";
import {
  signTransaction,
  sendSignedTransaction,
} from "../blockchain/evm/evmCallerUtils";
import { getMappings } from "../database/mappings";
import { bytes32BTC } from "../blockchain/btc/btcUtils";
import { myEmitter } from "../api/socket";
import { logUserExternalTx } from "./logUserExternalTx";
dotenv.config();

const errorDecoder = ErrorDecoder.create();

async function depositVaultTx(proof: any, nonce?: number) {
  try {
    const { amount, fromAddress, txid } = proof;
    const address = process.env.EVM_CONTRACT_OWNER_ADDRESS;
    const unsignedTx = await createUnsignedTransaction(proof, address, nonce);
    const signedTx = await signTransaction(
      unsignedTx,
      process.env.EVM_CONTRACT_KEY_ID,
    );
    const res = await sendSignedTransaction(signedTx);
    console.log("depositVaultTx success", res);
    const evmAddress = await getEVMAddress(fromAddress);
    const bitcoinAddressHash = await bytes32BTC(fromAddress);
    const txId = "0x" + txid;
    const exData = {
      evmAddress,
      type: 2,
      txid: txId,
      amount,
      bitcoinAddressHash,
    };

    const logUserExternalTxRes = await logUserExternalTx(exData, nonce);
    console.log("logUserExternalTx success", logUserExternalTxRes);
    myEmitter.emit("depositCompleted", { status: true });
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
      return await depositVaultTx(proof, nonce);
    } else {
      console.log({ err });
    }
  }
}

async function createUnsignedTransaction(proof, signerAddress, nonceInc) {
  const {
    version,
    vin,
    vout,
    witness,
    amount,
    fromAddress,
    blockHeight,
    index,
    intermediateNode,
    blockhash,
    txid,
  } = proof;
  const bitcoinAddressHash = await bytes32BTC(fromAddress);
  const evmAddress = await getEVMAddress(fromAddress);
  const depositParams = {
    version: "0x" + version,
    flag: "0x0001",
    vin: "0x" + vin,
    vout: "0x" + vout,
    witness: "0x" + witness,
    locktime: "0x00000000",
    amount: amount,
    bitcoin_address: bitcoinAddressHash,
    intermediate_nodes: intermediateNode,
    block_height: blockHeight,
    index: index,
    block_hash: "0x" + blockhash,
    transaction_id: "0x" + doubleSha256(Buffer.from(txid)).toString("hex"),
    transaction_hash: "0x" + txid,
    evm_address: evmAddress,
  };

  console.log({ depositParams });

  const contract = new ethers.Contract(
    HANDLER_CONTRACT_ADDRESS,
    HANDLER_CONTRACT_ABI,
    provider,
  );
  const nonce = nonceInc ? nonceInc : await getNonce(signerAddress);
  const gasPrice = await getGasPrice();
  //@ts-ignore
  const higherGasPrice = (gasPrice * 260n) / 10n;
  const unsignedTx =
    await contract.requestDeposit.populateTransaction(depositParams);
  //@ts-ignore
  unsignedTx.chainId = Number(process.env.EVM_CHAIN_ID);
  unsignedTx.nonce = nonce;
  unsignedTx.gasPrice = higherGasPrice;
  //@ts-ignore
  unsignedTx.gasLimit = 800000;
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

export { depositVaultTx };
