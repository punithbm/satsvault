import { hashMessage } from "@ethersproject/hash";
import { ethers } from "ethers";
import { ErrorDecoder } from "ethers-decode-error";
import * as bitcoin from "bitcoinjs-lib";

import { HANDLER_CONTRACT_ABI, HANDLER_CONTRACT_ADDRESS } from "../blockchain/evm/abi/handler";
import { getNonce, provider } from "../blockchain/evm/evmUtils";
import { signTransaction, sendSignedTransaction } from "../blockchain/evm/evmCallerUtils";
import { getMappings } from "../database/mappings";
import { btcToSats } from "../blockchain/btc/btcUtils";
import { btcSendTransaction } from "../blockchain/btc/btcTransaction";
import { getPortoMappingByAddress } from "../database/supabase";

const errorDecoder = ErrorDecoder.create();

async function depositFunds(bitcoinAddress: string) {
    const portoAddress = await getPortoMappingByAddress(bitcoinAddress);
    if(!portoAddress){
        return { status: false, data: "invalid bitcoin address" };
    }
    const keyId = portoAddress[0].porto_address;
    const pubkey = portoAddress[0].pub_key;
    const btcAddress = portoAddress[0].bitcoin_address;

    console.log({
        keyId,
        pubkey,
        btcAddress
    });

    try {
        const toAddress = process.env.VAULT_ADDRESS;
        const amount = btcToSats(0.1);
        const fromAddress = btcAddress;
        const response = await btcSendTransaction({
            fromAddress,
            toAddress,
            amount,
            pubkey,
            keyId
        });
        console.log("Response", response);
        if (typeof response === "object" && response !== null) {
            // Handle JSON response
            if (response.code && response.message) {
                // Handle error code and message
                console.error("Transaction error:", response.message);
                return { status: false, data: response.message };
            } else {
                // Assume success if no error code
                return { status: true, data: response };
            }
        } else if (typeof response === "string") {
            if (response.includes("RPC error")) {
                return { status: false, data: response };
            }
            // Handle plain text response
            console.log("Transaction response (text):", response);
            return { status: true, data: response };
        }
    } catch (err) {
        return { status: false, data: "" };
    }
}

export { depositFunds };
