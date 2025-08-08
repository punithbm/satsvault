import { ethers } from "ethers";
import {
    getBlockDataFromRecurringPayments,
    updateRecurringPaymentBlock
} from "../../database/supabase";
import { processRecurringPayment } from "../../payment/processRecurringPayments";

const provider = new ethers.WebSocketProvider("https://evm.ws.surge.dev");

let processingPromise = Promise.resolve();

async function initiateEthListener() {
    let blockData: any = [];
    provider.on("block", async (blockNumber) => {
        processingPromise = processingPromise
            .then(async () => {
                console.log("Processing block number:", blockNumber);
                blockData = await getBlockDataFromRecurringPayments();
                const blocks = blockData.map((record) => record.block) || [];
                const matchingBlocks = blockData.filter(
                    (block) => block.block <= blockNumber
                );
                const blockNumbers = blocks.filter((block) => block <= blockNumber);
                if (matchingBlocks.length > 0) {
                    console.log("matching blocks", matchingBlocks);
                    for (const mBlock of matchingBlocks) {
                        console.log("Processing block", mBlock);
                        const res = await processRecurringPayment(mBlock.id);
                    }
                    await updateRecurringPaymentBlocks(
                        blockData,
                        blockNumbers,
                        blockNumber
                    );
                    blockData = [];
                }
            })
            .catch(async (error) => {
                console.error(`Error processing block number ${blockNumber}:`, error);
                const blocks = blockData.map((record) => record.block) || [];
                const blockNumbers = blocks.filter((block) => block <= blockNumber);
                await updateRecurringPaymentBlocks(blockData, blockNumbers, blockNumber);
                blockData = [];
            });
    });
}

const updateRecurringPaymentBlocks = async (
    blockData: any,
    matchingBlocks: any,
    blockNumber: any
) => {
    const relevantBlockData = blockData.filter((record) =>
        matchingBlocks.includes(record.block)
    );
    for (const block of relevantBlockData) {
        const updatedBlockNumber = block.frequency / 5 + blockNumber;
        const updateListRes = await updateRecurringPaymentBlock(
            block.block,
            updatedBlockNumber
        );
        console.log("Update list result for block", updateListRes);
    }
};

export { initiateEthListener, provider };
