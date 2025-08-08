import { ethers } from "ethers";
import { HANDLER_CONTRACT_ABI, HANDLER_CONTRACT_ADDRESS } from "../blockchain/evm/abi/handler";
import { provider } from "../blockchain/evm/evmUtils";
import { getMappings } from "../database/mappings";
import { satsToBtc } from "../blockchain/btc/btcUtils";

async function getBalance(btcAddress: string) {
    try {
        const contract = new ethers.Contract(
            HANDLER_CONTRACT_ADDRESS,
            HANDLER_CONTRACT_ABI,
            provider
        );
        const mappings = await getMappings();
        const mapping = mappings.find((m) => m.btcaddress === btcAddress);
        if (!mapping) {
            console.error("Mapping not found for given btc address");
            return;
        }
        const btcAddressHash = mapping.btcaddresshash;
        const balance = await contract.getBtcDepositAmount(btcAddressHash);
        if (!balance) {
            return { status: false, message: "No balance found" };
        }
        const balanceInBtc = satsToBtc(balance);
        return { status: true, data: balanceInBtc };
    } catch (err) {
        console.log("err", err);
        return { status: false, message: "Failed to get balance" };
    }
}

export { getBalance };
