import dotenv from "dotenv";
dotenv.config();
import * as bitcoin from "bitcoinjs-lib";
import * as zmq from "zeromq";
import { setBlockInfo } from "../../services/setBTCBlockInfo";
import {
    extractWitnessData,
    getToAmount,
    parseTransaction,
    txValidator,
    formatVinsForValidation
} from "../../utils/utils";

import Client from "bitcoin-core";
import { depositVaultTx } from "../../services/deposit";
import { getTaprootAddresses } from "./btcAddressExtractor";
import { getOpReturnDataFromTx } from "./btcUtils";

const addr = `tcp://${process.env.BITCOIN_IP}:${process.env.TCP_SOCKET_PORT}`;

const txAddr = `tcp://${process.env.BITCOIN_IP}:28333`; // For rawtx
const blockAddr = `tcp://${process.env.BITCOIN_IP}:28332`; // For rawblock
const hashBlockAddr = `tcp://${process.env.BITCOIN_IP}:28334`; // For hashblock
const RECONNECT_INTERVAL = 5000; // 5 seconds
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const RPC_TIMEOUT = 10000; // 10 seconds

const client = new Client({
    network: "testnet",
    host: process.env.BITCOIN_IP,
    port: process.env.BITCOIN_RCP_PORT,
    username: process.env.BITCOIN_USERNAME,
    password: process.env.BITCOIN_PASSWORD,
    timeout: RPC_TIMEOUT
});

// Format timestamp for console logs
function getTimestamp() {
    return new Date().toISOString();
}

export async function runZMQ() {
    let txSock;
    let blockSock;
    let hashBlockSock;
    let heartbeatInterval;
    let isConnected = false;

    // Function to set up ZMQ connections
    const setupZMQConnection = async () => {
        try {
            // Clean up existing connections if any
            clearInterval(heartbeatInterval);

            if (txSock) {
                await txSock.disconnect(txAddr);
                await txSock.close();
            }

            if (blockSock) {
                await blockSock.disconnect(blockAddr);
                await blockSock.close();
            }

            if (hashBlockSock) {
                await hashBlockSock.disconnect(hashBlockAddr);
                await hashBlockSock.close();
            }

            console.log("Closed existing ZMQ connections");

            // Create new connections for each notification type
            console.log("Setting up ZMQ connections to Bitcoin node...");

            // Transaction socket
            txSock = new zmq.Subscriber();
            console.log(`Connecting to Bitcoin ZMQ for transactions at ${txAddr}...`);
            txSock.connect(txAddr);
            txSock.subscribe("rawtx");
            console.log("Connected to transaction notifications");

            // Block socket
            blockSock = new zmq.Subscriber();
            console.log(`Connecting to Bitcoin ZMQ for blocks at ${blockAddr}...`);
            blockSock.connect(blockAddr);
            blockSock.subscribe("rawblock");
            console.log("Connected to block notifications");

            // Hash block socket
            hashBlockSock = new zmq.Subscriber();
            console.log(
                `Connecting to Bitcoin ZMQ for block hashes at ${hashBlockAddr}...`
            );
            hashBlockSock.connect(hashBlockAddr);
            hashBlockSock.subscribe("hashblock");
            console.log("Connected to block hash notifications");

            // Check Bitcoin node configuration
            try {
                const info = await client.getNetworkInfo();
                console.log(`Connected to Bitcoin node: ${info.subversion}`);

                // Check if ZMQ is properly configured
                try {
                    const zmqInfo = await client.command("getzmqnotifications");
                    console.log("ZMQ notifications configured on Bitcoin node:");
                    console.log(JSON.stringify(zmqInfo, null, 2));
                } catch (error) {
                    console.warn(
                        "Could not get ZMQ notification info. Your Bitcoin node might be using an older version that doesn't support this command."
                    );
                }
            } catch (error) {
                console.error(
                    "Error checking Bitcoin node configuration:",
                    error.message
                );
            }
            isConnected = true;

            // Set up heartbeat to check connection
            heartbeatInterval = setInterval(async () => {
                try {
                    // Simple ping to Bitcoin node to check if it's responsive
                    await client.getBlockchainInfo();
                    console.log("ZMQ heartbeat: Bitcoin node is responsive");
                } catch (error) {
                    console.error(
                        "ZMQ heartbeat: Bitcoin node connection error:",
                        error.message
                    );
                    isConnected = false;
                    setupZMQConnection(); // Reconnect on heartbeat failure
                }
            }, HEARTBEAT_INTERVAL);

            // Start listening for all message types
            listenForTransactions();
            listenForBlocks();
            listenForBlockHashes();

            isConnected = true;
        } catch (error) {
            console.error("Error setting up ZMQ connections:", error);
            isConnected = false;

            // Schedule reconnection
            console.log(
                `Will attempt to reconnect in ${RECONNECT_INTERVAL / 1000} seconds...`
            );
            setTimeout(setupZMQConnection, RECONNECT_INTERVAL);
        }
    };

    // Function to listen for transactions
    const listenForTransactions = async () => {
        try {
            console.log("Starting to listen for Bitcoin transactions...");

            // Process incoming transaction messages
            for await (const [topic, msg] of txSock) {
                const topicStr = topic.toString();
                console.log(`Received ZMQ transaction notification: ${topicStr}`);

                if (topicStr === "rawtx") {
                    const rawTx = msg.toString("hex");
                    // Process transaction asynchronously to avoid blocking
                    processBitcoinTransaction(rawTx).catch((error) => {
                        console.error("Error in async transaction processing:", error);
                    });
                }
            }
        } catch (error) {
            console.error("Error in ZMQ transaction processing:", error);
            isConnected = false;

            // Schedule reconnection
            console.log(
                `ZMQ transaction connection lost. Will attempt to reconnect in ${
                    RECONNECT_INTERVAL / 1000
                } seconds...`
            );
            setTimeout(setupZMQConnection, RECONNECT_INTERVAL);
        }
    };

    // Function to listen for blocks
    const listenForBlocks = async () => {
        try {
            console.log("Starting to listen for Bitcoin blocks...");

            // Process incoming block messages
            for await (const [topic, msg] of blockSock) {
                const topicStr = topic.toString();
                console.log(`Received ZMQ block notification: ${topicStr}`);

                if (topicStr === "rawblock") {
                    console.log("Processing raw block data...");
                    const rawBlock = msg.toString("hex");
                    // Process block asynchronously
                    processBlock(rawBlock).catch((error) => {
                        console.error("Error in async block processing:", error);
                    });
                }
            }
        } catch (error) {
            console.error("Error in ZMQ block processing:", error);
            isConnected = false;

            // Schedule reconnection
            console.log(
                `ZMQ block connection lost. Will attempt to reconnect in ${
                    RECONNECT_INTERVAL / 1000
                } seconds...`
            );
            setTimeout(setupZMQConnection, RECONNECT_INTERVAL);
        }
    };

    // Function to listen for block hashes
    const listenForBlockHashes = async () => {
        try {
            console.log("Starting to listen for Bitcoin block hashes...");

            // Process incoming block hash messages
            for await (const [topic, msg] of hashBlockSock) {
                const topicStr = topic.toString();
                console.log(`Received ZMQ block hash notification: ${topicStr}`);

                if (topicStr === "hashblock") {
                    console.log("Received block hash notification!");
                    const blockHash = msg.toString("hex");
                    console.log(`Block hash received: ${blockHash}`);

                    // Get block data with the hash
                    try {
                        const blockData = await client.getBlock(blockHash, 0);
                        processBlock(blockData).catch((error) => {
                            console.error("Error processing block from hash:", error);
                        });
                    } catch (error) {
                        console.error(
                            `Error getting block data for hash ${blockHash}:`,
                            error.message
                        );
                    }
                }
            }
        } catch (error) {
            console.error("Error in ZMQ block hash processing:", error);
            isConnected = false;

            // Schedule reconnection
            console.log(
                `ZMQ block hash connection lost. Will attempt to reconnect in ${
                    RECONNECT_INTERVAL / 1000
                } seconds...`
            );
            setTimeout(setupZMQConnection, RECONNECT_INTERVAL);
        }
    };

    // Function to process Bitcoin transaction
    const processBitcoinTransaction = async (rawTx: string) => {
        const tx = bitcoin.Transaction.fromHex(rawTx);

        const amount = getToAmount(rawTx)?.[0]?.value;

        const result = await getTaprootAddresses(tx, client, true);

        const toAddress = result.to
            .map((address) => address.address)
            .find((address) => address !== null);

        let fromAddress = result.from
            .map((address) => address.address)
            .find((address) => address !== null);

        const txid = tx.getId();

        const vinss = formatVinsForValidation(tx);

        // Get transaction data with timeout handling
        let rawTransactionData;
        try {
            rawTransactionData = await Promise.race([
                client.getRawTransaction(txid, true),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("RPC timeout")), RPC_TIMEOUT)
                )
            ]);
        } catch (error) {
            console.error(`Error getting raw transaction ${txid}:`, error.message);
            return;
        }

        if (!rawTransactionData.blockhash) {
            console.log(
                `Transaction ${txid} not yet in a block, will be processed when confirmed`
            );
            return;
        }

        // Get block data with timeout handling
        let block;
        try {
            block = await Promise.race([
                client.getBlock(rawTransactionData.blockhash),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("RPC timeout")), RPC_TIMEOUT)
                )
            ]);
        } catch (error) {
            console.error(`Error getting block for ${txid}:`, error.message);
            return;
        }

        if (!block) {
            console.error("Block not found!");
            return;
        }

        // Get detailed block data with timeout handling
        let blockWithTxs;
        try {
            blockWithTxs = await Promise.race([
                client.getBlock(rawTransactionData.blockhash, 2),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("RPC timeout")), RPC_TIMEOUT)
                )
            ]);
        } catch (error) {
            console.error(`Error getting detailed block for ${txid}:`, error.message);
            return;
        }

        const txObj = parseTransaction(rawTx);

        const { version, flag, outputsHex: vout, locktime } = txObj;

        const vin = vinss;

        const witness = extractWitnessData(rawTx);

        const blockHeight = blockWithTxs.height;

        const index = blockWithTxs?.tx?.findIndex((tx) => tx.txid === txid);

        if (index === undefined) {
            console.log("index not found!");
            return;
        }

        const { proofHex: intermediateNode, rootHex } = txValidator(block?.tx, txid);

        const blockhash = rawTransactionData?.blockhash;

        const merkleroot = blockWithTxs.merkleroot;

        if (!blockhash || !rootHex) {
            return;
        }

        // await setBlockInfo({ blockhash: "0x" + blockhash, rootHex });

        if (index !== undefined) {
            if (toAddress && toAddress.includes(process.env.VAULT_ADDRESS)) {
                console.log("came in address", { fromAddress, toAddress });

                if (fromAddress === process.env.FAUCET_ADDRESS) {
                    console.log("came in faucet address");
                    const data = await getOpReturnDataFromTx(tx);
                    const opReturnData = data[0];
                    const opReturnDataString = opReturnData.toString("utf8");
                    console.log("op return data", opReturnDataString);
                    if (opReturnDataString) {
                        fromAddress = opReturnDataString;
                    }
                }

                depositVaultTx({
                    version,
                    flag,
                    vin,
                    vout,
                    witness,
                    locktime,
                    amount, // amount
                    toAddress,
                    fromAddress, //address
                    intermediateNode,
                    blockhash,
                    index,
                    txid,
                    blockHeight
                });
            }
        }
    };

    // Function to process block
    const processBlock = async (blockData: any) => {
        console.log("Processing block data...");
        // Handle both hex string and block object
        let block;
        let blockHash;
        let txCount;
        try {
            block = bitcoin.Block.fromHex(blockData);
            blockHash = block.getId();
            txCount = block.transactions ? block.transactions.length : 0;
        } catch (error) {
            console.log("Could not parse as raw block, trying as block hash...");
            blockHash = blockData;
            txCount = 0;
        }
        console.log(`New block received: ${blockHash} with ${txCount} transactions`);
        try {
            const blockInfo = await Promise.race([
                client.getBlock(blockHash, 1),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("RPC timeout")), RPC_TIMEOUT)
                )
            ]);
            if (blockInfo) {
                console.log(
                    `[${getTimestamp()}] Block: ${blockHash}, Height: ${
                        blockInfo.height
                    }, Tx Count: ${txCount}, Size: ${blockInfo.size} bytes, Weight: ${
                        blockInfo.weight
                    }, Time: ${new Date(blockInfo.time * 1000).toISOString()}`
                );
            }
        } catch (error) {
            console.error(`Error getting block info for ${blockHash}:`, error.message);
        }
    };

    // Initial connection setup
    await setupZMQConnection();
}
