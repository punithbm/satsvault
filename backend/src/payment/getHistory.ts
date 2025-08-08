import { ethers } from "ethers";
import { HANDLER_CONTRACT_ABI, HANDLER_CONTRACT_ADDRESS } from "../blockchain/evm/abi/handler";
import { provider } from "../blockchain/evm/evmUtils";
import { getAddressMapping, getMappings } from "../database/mappings";

enum transactionType {
    SEND = "1",
    DEPOSIT = "2",
    WITHDRAW = "3"
}

async function getHistory(btcAddress: string) {
    try {
        const contract = new ethers.Contract(
            HANDLER_CONTRACT_ADDRESS,
            HANDLER_CONTRACT_ABI,
            provider
        );
        const mappings = await getMappings();
        const addressMappings = await getAddressMapping();
        const mapping = mappings.find((m) => m.btcaddress === btcAddress);
        const addressMapping = addressMappings.find((m) => m.btcaddress === btcAddress);
        if (!mapping && !addressMapping) {
            console.error("Mapping not found for given btc address");
            return;
        }
        const evmAddress = mapping?.evmaddress || addressMapping?.evmaddress;
        const txCount = await contract.userTxCount(evmAddress);
        const history = [];

        const loopStart = txCount > BigInt(10) ? txCount : BigInt(txCount);
        const loopEnd = txCount > BigInt(10) ? txCount - BigInt(10) : BigInt(0);

        console.log("txCount", txCount);
        console.log("loopStart", loopStart);
        console.log("loopEnd", loopEnd);

        for (let i = loopStart; i > loopEnd; i--) {
            const tx = await contract.userTxsByIndex(evmAddress, Number(i - BigInt(1)));
            console.log("tx", tx);
            let txHash = tx[2];
            let fromAddressMapping;
            let fromAddress = "";
            let toAddress = "";
            if (tx[1].toString() === transactionType.DEPOSIT) {
                const fromAddressMapping = mappings.find(
                    (m) => m.btcaddresshash === tx[4]
                );
                fromAddress = fromAddressMapping?.btcaddress || "";
                if (!fromAddress) {
                    fromAddress =
                        addressMappings.find((m) => m.btcaddresshash === tx[4])
                            ?.btcaddress || "";
                }
                toAddress = process.env.VAULT_ADDRESS;
            } else {
                fromAddressMapping = mappings.find((m) => m.btcaddresshash === tx[2]);
                fromAddress = fromAddressMapping?.btcaddress || "";
                if (!fromAddress) {
                    fromAddress =
                        addressMappings.find((m) => m.btcaddresshash === tx[2])
                            ?.btcaddress || "";
                }
                const toAddressMapping = mappings.find((m) => m.btcaddresshash === tx[4]);
                toAddress = toAddressMapping?.btcaddress || "";
                if (!toAddress) {
                    toAddress =
                        addressMappings.find((m) => m.btcaddresshash === tx[4])
                            ?.btcaddress || "";
                }
            }

            if (tx[1].toString() === transactionType.WITHDRAW) {
                fromAddress = process.env.VAULT_ADDRESS;
            }

            const txUpdated = {
                timestamp: tx[0],
                amount: tx[3],
                type:
                    tx[1].toString() == "1"
                        ? "send"
                        : tx[1].toString() == "2"
                        ? "deposit"
                        : tx[1].toString() == "3"
                        ? "withdraw"
                        : tx[1].toString() == "4"
                        ? "autopay"
                        : "others",
                fromAddress,
                toAddress,
                txHash
            };
            history.push(txUpdated);
        }
        return { status: true, data: history };
    } catch (err) {
        console.error("Error getting history:", err);
        return { status: false, message: "Failed to get history" };
    }
}

export { getHistory };
