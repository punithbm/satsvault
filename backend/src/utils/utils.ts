import * as bitcoin from "bitcoinjs-lib";
import crypto from "crypto";
import * as ecc from "tiny-secp256k1";
import { getMappings } from "../database/mappings";

bitcoin.initEccLib(ecc);

function parseVarInt(hexString, startIndex) {
    let firstByte = parseInt(hexString.substring(startIndex, startIndex + 2), 16);
    if (firstByte < 0xfd) {
        return { length: 2, value: firstByte };
    } else if (firstByte === 0xfd) {
        let value = parseInt(hexString.substring(startIndex + 2, startIndex + 6), 16);
        return { length: 6, value: value };
    } else if (firstByte === 0xfe) {
        let value = parseInt(hexString.substring(startIndex + 2, startIndex + 10), 16);
        return { length: 10, value: value };
    } else {
        let value = parseInt(hexString.substring(startIndex + 2, startIndex + 18), 16);
        return { length: 18, value: value };
    }
}

function parseInputs(hexString, startIndex, inputCount) {
    let inputsHex = "";
    let currentIndex = startIndex;

    for (let i = 0; i < inputCount; i++) {
        const prevTxHash = hexString.substring(currentIndex, currentIndex + 64);
        currentIndex += 64;

        const prevTxIndex = hexString.substring(currentIndex, currentIndex + 8);
        currentIndex += 8;

        const { length: scriptLenBytes, value: scriptLen } = parseVarInt(
            hexString,
            currentIndex
        );
        currentIndex += scriptLenBytes;

        const signatureScript = hexString.substring(
            currentIndex,
            currentIndex + scriptLen * 2
        );
        currentIndex += scriptLen * 2;

        const sequence = hexString.substring(currentIndex, currentIndex + 8);
        currentIndex += 8;

        inputsHex +=
            prevTxHash +
            prevTxIndex +
            hexString.substring(currentIndex - scriptLenBytes, currentIndex) +
            signatureScript +
            sequence;
    }

    return { inputsHex, currentIndex };
}

function parseOutputs(hexString, startIndex, outputCount) {
    let outputsHex = "";
    let currentIndex = startIndex;

    for (let i = 0; i < outputCount; i++) {
        const value = hexString.substring(currentIndex, currentIndex + 16);
        currentIndex += 16;

        const { length: scriptLenBytes, value: scriptLen } = parseVarInt(
            hexString,
            currentIndex
        );
        currentIndex += scriptLenBytes;

        const pkScript = hexString.substring(currentIndex, currentIndex + scriptLen * 2);
        currentIndex += scriptLen * 2;

        outputsHex +=
            value +
            hexString.substring(currentIndex - scriptLenBytes, currentIndex) +
            pkScript;
    }

    return { outputsHex, currentIndex };
}

function parseWitness(hexString, startIndex, inputCount) {
    let witnessHex = "";
    let currentIndex = startIndex;

    for (let i = 0; i < inputCount; i++) {
        const { length: witnessCountLen, value: witnessCount } = parseVarInt(
            hexString,
            currentIndex
        );
        currentIndex += witnessCountLen;

        witnessHex += hexString.substring(currentIndex - witnessCountLen, currentIndex);

        for (let j = 0; j < witnessCount; j++) {
            const { length: itemLenBytes, value: itemLen } = parseVarInt(
                hexString,
                currentIndex
            );
            currentIndex += itemLenBytes;

            const item = hexString.substring(currentIndex, currentIndex + itemLen * 2);
            currentIndex += itemLen * 2;

            witnessHex += hexString.substring(currentIndex - itemLenBytes, currentIndex);
        }
    }

    return { witnessHex, currentIndex };
}

function parseTransaction(rawTx) {
    const versionLength = 4 * 2; // 4 bytes * 2 hex chars per byte
    const markerLength = 1 * 2; // 1 byte * 2 hex chars per byte
    const flagLength = 1 * 2; // 1 byte * 2 hex chars per byte

    const version = rawTx.substring(0, versionLength);
    const marker = rawTx.substring(versionLength, versionLength + markerLength);
    const flag = rawTx.substring(
        versionLength + markerLength,
        versionLength + markerLength + flagLength
    );

    const inputCountStart = versionLength + markerLength + flagLength;
    const { length: inputCountLen, value: inputCount } = parseVarInt(
        rawTx,
        inputCountStart
    );

    const firstInputStart = inputCountStart + inputCountLen;
    const { inputsHex, currentIndex: inputsEnd } = parseInputs(
        rawTx,
        firstInputStart,
        inputCount
    );

    const { length: outputCountLen, value: outputCount } = parseVarInt(rawTx, inputsEnd);
    const firstOutputStart = inputsEnd + outputCountLen;
    const { outputsHex, currentIndex: outputsEnd } = parseOutputs(
        rawTx,
        firstOutputStart,
        outputCount
    );

    const { witnessHex, currentIndex: witnessEnd } = parseWitness(
        rawTx,
        outputsEnd,
        inputCount
    );

    const locktime = rawTx.substring(witnessEnd, witnessEnd + 8);

    return {
        version,
        marker,
        flag,
        inputsHex: rawTx.substring(firstInputStart, inputsEnd),
        outputsHex: rawTx.substring(inputsEnd, outputsEnd),
        witnessHex: witnessHex,
        locktime
    };
}

function getVinVout(rawTxHex) {
    const tx = bitcoin.Transaction.fromHex(rawTxHex);

    const vin = tx.ins
        .map((input) => {
            const txid = Buffer.from(input.hash).reverse().toString("hex");
            const vout = input.index;
            const scriptSigLen = bitcoin.script.number
                .encode(input.script.length)
                .toString("hex");
            const scriptSig = input.script.toString("hex");
            const sequence = input.sequence.toString(16).padStart(8, "0");
            const witness = input.witness
                .map((w) => {
                    const witnessLen = bitcoin.script.number
                        //@ts-ignore
                        .encode(Buffer.from(w, "hex").length)
                        .toString("hex");
                    return witnessLen + w.toString("hex");
                })
                .join("");
            return (
                txid +
                vout.toString(16).padStart(8, "0") +
                scriptSigLen +
                scriptSig +
                sequence +
                witness
            );
        })
        .join("");

    const vout = tx.outs
        .map((output) => {
            const value = output.value.toString(16).padStart(16, "0");
            const scriptPubKeyLen = bitcoin.script.number
                .encode(output.script.length)
                .toString("hex");
            const scriptPubKey = output.script.toString("hex");

            return value + scriptPubKeyLen + scriptPubKey;
        })
        .join("");

    // validateVinHex(vin);
    // validateVinHex("01044a20fa450b176ed0c1a9be2128f0ed7ab62e78effd90f8c96f61b505f5c0d20000000000fdffffff");

    return { vin, vout };
}

function validateVinHex(rawVinHex) {
    // Convert raw vin hex to buffer
    const vinBuffer = Buffer.from(rawVinHex, "hex");

    // Function to read a varint from the buffer
    function readVarInt(buffer, offset) {
        const first = buffer[offset];
        if (first < 0xfd) {
            return { value: first, size: 1 };
        } else if (first === 0xfd) {
            return { value: buffer.readUInt16LE(offset + 1), size: 3 };
        } else if (first === 0xfe) {
            return { value: buffer.readUInt32LE(offset + 1), size: 5 };
        } else {
            return { value: Number(buffer.readBigUInt64LE(offset + 1)), size: 9 };
        }
    }

    // Function to determine the length of the input at a given offset
    function determineInputLengthAt(buffer, offset) {
        if (buffer.length < offset + 36) {
            return { length: 999999, isValid: false };
        }
        const txid = buffer.slice(offset, offset + 32);
        const vout = buffer.readUInt32LE(offset + 32);
        const scriptSigLength = buffer.readUInt8(offset + 36);
        const totalLength = 36 + 1 + scriptSigLength + 4; // txid (32) + vout (4) + scriptSig length (1) + scriptSig + sequence (4)
        if (buffer.length < offset + totalLength) {
            return { length: 999999, isValid: false };
        }
        return { length: totalLength, isValid: true };
    }

    // Function to validate the vin
    function validateVin(buffer) {
        const varInt = readVarInt(buffer, 0);
        const nIns = varInt.value;
        const varIntSize = varInt.size;

        if (nIns === 0 || varIntSize === 999999) {
            return false;
        }

        let offset = varIntSize;

        for (let i = 0; i < nIns; i++) {
            if (offset >= buffer.length) {
                return false;
            }
            const inputLen = determineInputLengthAt(buffer, offset);
            if (!inputLen.isValid) {
                return false;
            }
            offset += inputLen.length;
        }

        return offset === buffer.length;
    }

    const isValidVin = validateVin(vinBuffer);

    return isValidVin;
}

const decodeOpReturn = (txHex) => {
    // Function to convert hex to ASCII
    const hexToAscii = (hex) =>
        hex
            .match(/.{1,2}/g)
            ?.map((byte) => String.fromCharCode(parseInt(byte, 16)))
            .join("") ?? "";

    // Find the OP_RETURN output
    const opReturnPrefix = "6a"; // OP_RETURN prefix
    const opReturnIndex = txHex.indexOf(opReturnPrefix);

    if (opReturnIndex === -1) {

    }

    // Extract the length of the data part
    const dataLengthHex = txHex.substr(opReturnIndex + 2, 2);
    const dataLength = parseInt(dataLengthHex, 16) * 2; // multiply by 2 for hex string length

    // Extract the OP_RETURN data
    const dataStartIndex = opReturnIndex + 4; // 2 for "6a" and 2 for length
    const opReturnDataHex = txHex.substr(dataStartIndex, dataLength);

    // Convert the data to ASCII
    return hexToAscii(opReturnDataHex);
};

function doubleSha256(buffer) {
    return crypto
        .createHash("sha256")
        .update(crypto.createHash("sha256").update(buffer).digest())
        .digest();
}

function buildMerkleTree(transactions) {
    if (transactions.length === 0) return [];
    if (transactions.length === 1) return [transactions[0]];

    let tree = transactions.map((tx) => doubleSha256(Buffer.from(tx)));

    while (tree.length > 1) {
        if (tree.length % 2 !== 0) {
            tree.push(tree[tree.length - 1]); // Duplicate last element if odd number
        }

        let newLevel = [];
        for (let i = 0; i < tree.length; i += 2) {
            newLevel.push(doubleSha256(Buffer.concat([tree[i], tree[i + 1]])));
        }
        tree = newLevel;
    }

    return tree;
}

function getMerkleProof(transactions, targetTx) {
    let tree = transactions.map((tx) => doubleSha256(Buffer.from(tx)));
    let proof = [];
    let targetHash = doubleSha256(Buffer.from(targetTx));

    while (tree.length > 1) {
        if (tree.length % 2 !== 0) {
            tree.push(tree[tree.length - 1]); // Duplicate last element if odd number
        }

        let newLevel = [];
        for (let i = 0; i < tree.length; i += 2) {
            if (tree[i].equals(targetHash)) {
                proof.push(tree[i + 1]);
                targetHash = doubleSha256(Buffer.concat([tree[i], tree[i + 1]]));
            } else if (tree[i + 1].equals(targetHash)) {
                proof.push(tree[i]);
                targetHash = doubleSha256(Buffer.concat([tree[i], tree[i + 1]]));
            }
            newLevel.push(doubleSha256(Buffer.concat([tree[i], tree[i + 1]])));
        }
        tree = newLevel;
    }

    return proof.map((hash) => hash.toString("hex"));
}

function txValidator(transactions, targetTx) {
    if (transactions.length === 0) {

        return;
    }
    const root = buildMerkleTree(transactions)[0].toString("hex");
    const proof = getMerkleProof(transactions, targetTx);
    const leaf = doubleSha256(Buffer.from(targetTx)).toString("hex");
    const leafHex = "0x" + leaf;
    const proofHex = "0x" + proof.map((p) => p.toString("hex")).join("");
    const rootHex = "0x" + root;
    const index = transactions.indexOf(targetTx);

    return { rootHex, proofHex };
}

function extractWitnessData(rawTransaction) {
    // Convert the raw transaction hex to a buffer for easier manipulation
    const buffer = Buffer.from(rawTransaction, "hex");

    // Transaction format constants
    const txVersionLength = 4;
    const txMarkerLength = 1;
    const txFlagLength = 1;
    const outpointLength = 36;
    const sequenceLength = 4;

    // Start offset to parse the transaction
    let offset = 0;

    // Read version
    offset += txVersionLength;

    // Read marker and flag
    const marker = buffer.readUInt8(offset);
    offset += txMarkerLength;
    const flag = buffer.readUInt8(offset);
    offset += txFlagLength;

    if (marker !== 0x00 || flag !== 0x01) {
        throw new Error("Transaction is not a witness transaction");
    }

    // Read the number of inputs
    const vinLen = buffer.readUInt8(offset);
    offset += 1;

    // Iterate through inputs
    for (let i = 0; i < vinLen; i++) {
        offset += outpointLength; // Outpoint (32 bytes hash + 4 bytes index)
        const scriptLength = buffer.readUInt8(offset);
        offset += 1 + scriptLength; // Script length + script
        offset += sequenceLength; // Sequence
    }

    // Read the number of outputs
    const voutLen = buffer.readUInt8(offset);
    offset += 1;

    // Iterate through outputs
    for (let i = 0; i < voutLen; i++) {
        offset += 8; // Value (8 bytes)
        const scriptLength = buffer.readUInt8(offset);
        offset += 1 + scriptLength; // Script length + script
    }

    // Now offset is at the beginning of the witness data
    let witnessData = "";

    // Iterate through each input to extract witness data
    for (let i = 0; i < vinLen; i++) {
        const witnessCount = buffer.readUInt8(offset);
        witnessData += buffer.slice(offset, offset + 1).toString("hex"); // Witness count
        offset += 1;

        for (let j = 0; j < witnessCount; j++) {
            const witnessLength = buffer.readUInt8(offset);
            witnessData += buffer.slice(offset, offset + 1).toString("hex"); // Witness length
            offset += 1;

            const witness = buffer.slice(offset, offset + witnessLength).toString("hex");
            witnessData += witness;
            offset += witnessLength;
        }
    }
    return witnessData;
}

function decodeTransaction(tx) {
    const addresses = [];
    tx.outs.forEach((out) => {
        let address;
        try {
            address = bitcoin.address.fromOutputScript(
                out.script,
                bitcoin.networks.testnet
            );
            addresses.push(address);
        } catch (e) {
            // Handle specific error messages
            if (e.message.includes("has no matching Address")) {
                // Try to decode Taproot address
                try {
                    if (!addresses.length) {
                        const p2tr = bitcoin.payments.p2tr({
                            output: out.script,
                            network: bitcoin.networks.testnet
                        });
                        if (p2tr.address) {
                            addresses.push(p2tr.address);
                        }
                    }
                } catch (taprootError) {
                    console.log({ taprootError });
                    // Skip outputs that cannot be decoded to a valid address
                }
            }
        }
    });

    return { addresses };
}

function isRevealTransaction(tx) {
    const hasWitnessData = tx.ins.some(
        (input) => input.witness && input.witness.length > 2
    );
    return hasWitnessData;
}

function createSegWitVin(prevTxId, prevVout, sequence, nIns) {
    const vinBuffer = Buffer.alloc(1 + 32 + 4 + 1 + 4); // nIns + txid + vout + scriptSig length + sequence

    // Number of inputs
    vinBuffer.writeUInt8(nIns, 0);

    // Previous transaction hash (directly, not reversed)
    Buffer.from(prevTxId, "hex").copy(vinBuffer, 1, 0, 32);

    // Previous output index (little-endian)
    vinBuffer.writeUInt32LE(prevVout, 33);

    // ScriptSig length (always 0 for SegWit)
    vinBuffer.writeUInt8(0, 37);

    // Sequence (little-endian)
    vinBuffer.writeUInt32LE(sequence, 38);

    return vinBuffer.toString("hex");
}

function getToAmount(txHex) {
    const tx = bitcoin.Transaction.fromHex(txHex);
    const outs = tx.outs.map((output) => ({
        value: output.value,
        script: output.script.toString("hex")
    }));
    return outs;
}

async function getEVMAddress(btcAddress: string) {
    const mappings = await getMappings();
    const mapping = mappings.find((m) => m.btcaddress === btcAddress);
    if (!mapping) {
        console.error("Mapping not found for given btc address");
        return null;
    }
    const evmAddress = mapping.evmAddress;
    return evmAddress;
}

function formatVinsForValidation(tx) {
    // Create buffer for number of inputs
    const nIns = tx.ins.length;
    const countBuffer = Buffer.alloc(1);
    countBuffer.writeUInt8(nIns, 0);

    // Create buffers for each input
    const vinBuffers = tx.ins.map((vin) => {
        // Each input has: txid(32) + vout(4) + scriptSig length(1) + sequence(4)
        const vinBuffer = Buffer.alloc(41);

        // Previous transaction hash
        vin.hash.copy(vinBuffer, 0, 0, 32);

        // Previous output index (little-endian)
        vinBuffer.writeUInt32LE(vin.index, 32);

        // ScriptSig length (always 0 for SegWit)
        vinBuffer.writeUInt8(0, 36);

        // Sequence (little-endian)
        vinBuffer.writeUInt32LE(vin.sequence, 37);

        return vinBuffer;
    });

    // Concatenate buffers and convert to hex
    return Buffer.concat([countBuffer, ...vinBuffers]).toString("hex");
}

export {
    parseTransaction,
    getVinVout,
    validateVinHex,
    decodeOpReturn,
    txValidator,
    extractWitnessData,
    decodeTransaction,
    createSegWitVin,
    isRevealTransaction,
    getToAmount,
    getEVMAddress,
    formatVinsForValidation
};
