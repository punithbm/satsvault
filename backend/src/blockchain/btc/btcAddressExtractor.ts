import * as bitcoin from "bitcoinjs-lib";

/**
 * Gets transaction details and returns from and to addresses for different Bitcoin transaction types
 * with support for Taproot addresses and other address formats
 * @param {Object} transaction - Bitcoin transaction object
 * @param {Object} client - Bitcoin RPC client
 * @param {boolean} isTestnet - Flag to indicate if using testnet or mainnet
 * @returns {Object} Transaction details with properly formatted address information
 */
async function getTaprootAddresses(transaction, client, isTestnet = true) {
    // Get network based on testnet flag
    const network = isTestnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;

    // Initialize result
    const result = {
        txid: getTxid(transaction),
        network: isTestnet ? "testnet" : "mainnet",
        from: [],
        to: []
    };

    // Store from addresses to filter out change later
    const fromAddresses = new Set();

    // Check if this is a coinbase transaction
    if (isCoinbaseTransaction(transaction)) {
        result.from.push({
            type: "coinbase",
            address: "Coinbase (New Bitcoins)"
        });
    } else {
        // Process inputs to get "from" addresses
        for (const input of transaction.ins) {
            try {
                const txid = Buffer.from(input.hash).reverse().toString("hex");
                const prevTx = await client.getRawTransaction(txid, true);

                if (prevTx && prevTx.vout && prevTx.vout[input.index]) {
                    const prevOut = prevTx.vout[input.index];

                    try {
                        // Get output script
                        const outputScript = Buffer.from(prevOut.scriptPubKey.hex, "hex");

                        // Determine address format and type based on the script
                        const addressInfo = getAddressInfoFromScript(
                            outputScript,
                            network
                        );

                        if (addressInfo) {
                            if (addressInfo.type === "P2WPKH") {
                                console.log(
                                    "Processing P2WPKH address:",
                                    addressInfo.address
                                );
                            }
                            result.from.push({
                                address: addressInfo.address,
                                value: prevOut.value,
                                type: addressInfo.type,
                                prevTxid: txid,
                                vout: input.index
                            });

                            // Add to our set of from addresses for change detection
                            fromAddresses.add(addressInfo.address);
                        }
                    } catch (e) {
                        // Skip non-standard scripts or errors
                        console.error("Error decoding input address:", e.message);
                    }
                }
            } catch (error) {
                console.error(`Error processing input: ${error.message}`);
            }
        }
    }

    // Process outputs to get "to" addresses
    transaction.outs.forEach((output, index) => {
        try {
            // Determine address format and type based on the script
            const addressInfo = getAddressInfoFromScript(output.script, network);

            if (addressInfo) {
                if (addressInfo.type === "P2WPKH") {
                    console.log("Processing P2WPKH address:", addressInfo.address);
                }
                // Skip this output if it's a change address (matches an input address)
                if (!fromAddresses.has(addressInfo.address)) {
                    result.to.push({
                        index,
                        address: addressInfo.address,
                        value: output.value / 100000000, // Convert satoshis to BTC
                        type: addressInfo.type,
                        // Include the script hex for reference/debugging
                        scriptHex: output.script.toString("hex")
                    });
                } else {
                    // It's a change address, add it with change flag
                    result.to.push({
                        index,
                        address: addressInfo.address,
                        value: output.value / 100000000, // Convert satoshis to BTC
                        type: addressInfo.type,
                        isChange: true,
                        scriptHex: output.script.toString("hex")
                    });
                }
            }
        } catch (e) {
            // Handle OP_RETURN and other special outputs
            if (output.script[0] === 0x6a) {
                // OP_RETURN
                result.to.push({
                    index,
                    type: "OP_RETURN",
                    value: output.value / 100000000,
                    data: output.script.slice(1).toString("hex"),
                    scriptHex: output.script.toString("hex")
                });
            } else if (!e.message.includes("has no matching Address")) {
                console.error("Error decoding output address:", e.message);
            }
        }
    });

    return result;
}

/**
 * Determines the address type and format based on the script
 * @param {Buffer} script - Output script
 * @param {Object} network - Bitcoin network object
 * @returns {Object|null} Address information object or null if not decodable
 */
function getAddressInfoFromScript(script, network) {
    try {
        // Try to convert script to address
        const address = bitcoin.address.fromOutputScript(script, network);

        // Determine address type based on prefix
        let type;

        if (network === bitcoin.networks.testnet) {
            // Testnet address types
            if (address.startsWith("tb1p")) {
                type = "P2TR"; // Taproot
            } else if (address.startsWith("tb1q")) {
                type = "P2WPKH"; // Native SegWit
            } else if (address.startsWith("2")) {
                type = "P2SH"; // Script Hash (possibly P2SH-wrapped SegWit)
            } else if (address.startsWith("m") || address.startsWith("n")) {
                type = "P2PKH"; // Legacy
            } else {
                type = "Unknown";
            }
        } else {
            // Mainnet address types
            if (address.startsWith("bc1p")) {
                type = "P2TR"; // Taproot
            } else if (address.startsWith("bc1q")) {
                type = "P2WPKH"; // Native SegWit
            } else if (address.startsWith("3")) {
                type = "P2SH"; // Script Hash (possibly P2SH-wrapped SegWit)
            } else if (address.startsWith("1")) {
                type = "P2PKH"; // Legacy
            } else {
                type = "Unknown";
            }
        }

        return {
            address,
            type
        };
    } catch (e) {
        // Return null if we can't decode the address
        return null;
    }
}

/**
 * Checks if the transaction is a coinbase transaction
 * @param {Object} transaction - Bitcoin transaction object
 * @returns {boolean} True if coinbase transaction
 */
function isCoinbaseTransaction(transaction) {
    return (
        transaction.ins.length === 1 &&
        transaction.ins[0].hash.toString("hex") === "0".repeat(64) &&
        (transaction.ins[0].index === 0xffffffff || transaction.ins[0].index === -1)
    );
}

/**
 * Gets transaction hash/id
 * @param {Object} transaction - Bitcoin transaction object
 * @returns {string} Transaction ID
 */
function getTxid(transaction) {
    // For bitcoinjs-lib transaction object
    if (typeof transaction.getId === "function") {
        return transaction.getId();
    }

    // For transaction from RPC client
    if (transaction.txid) {
        return transaction.txid;
    }

    // Calculate txid manually if needed
    return bitcoin.crypto.hash256(transaction.toBuffer()).reverse().toString("hex");
}

export { getTaprootAddresses, getAddressInfoFromScript, isCoinbaseTransaction, getTxid };
