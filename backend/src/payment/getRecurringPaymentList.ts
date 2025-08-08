import { ethers } from "ethers";
import { HANDLER_CONTRACT_ABI, HANDLER_CONTRACT_ADDRESS } from "../blockchain/evm/abi/handler";
import { provider } from "../blockchain/evm/evmUtils";

async function getRecurringPaymentList() {
    try {
        const contract = new ethers.Contract(
            HANDLER_CONTRACT_ADDRESS,
            HANDLER_CONTRACT_ABI,
            provider
        );
        console.log("contract called");
        // Start with index 0 and handle the error gracefully
        try {
            const payment = await contract.recurringPaymentsList(0);
            console.log({ payment });
            return { status: true, data: payment };
        } catch (innerErr) {
            if (innerErr.code === "CALL_EXCEPTION") {
                return { status: false, message: "No payments exist yet" };
            }
            throw innerErr;
        }
    } catch (err) {
        console.log("err", err);
        return { status: false, message: "Failed to get payment" };
    }
}
export { getRecurringPaymentList };
