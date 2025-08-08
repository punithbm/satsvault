import { ErrorDecoder } from "ethers-decode-error";
import { Psbt, networks, Transaction, address } from "bitcoinjs-lib";
import dotenv from "dotenv";
import { signBTCTransaction } from "./btcCallerUtils";
import ecdsaSigFormatter from "ecdsa-sig-formatter";

const toXOnly = (pubKey: any) => (pubKey.length === 32 ? pubKey : pubKey.slice(1, 33));

// Address type detection utility
const getAddressType = (address: string): 'P2WPKH' | 'P2TR' | 'UNKNOWN' => {
    if (address.startsWith('tb1q') || address.startsWith('bc1q')) {
        return 'P2WPKH';
    } else if (address.startsWith('tb1p') || address.startsWith('bc1p')) {
        return 'P2TR';
    }
    return 'UNKNOWN';
};

dotenv.config();

const UNCONFIRMED_HEIGHT = 4194303;

async function btcSendTransaction(params: {
    fromAddress: string;
    toAddress: string;
    amount: number;
    pubkey: string;
    keyId: string;
    embed?: any;
}) {
    const { toAddress, amount, fromAddress, pubkey, keyId, embed } = params;
    try {
        const address = fromAddress;
        return await createSendTransaction(
            address,
            toAddress,
            amount,
            pubkey,
            keyId,
            embed
        );
    } catch (err) {
        console.error("Error in btcSendTransaction:", err);
        throw err;
    }
}

async function createSendTransaction(
    address: string,
    toAddress: string,
    amount: number,
    pubkey: string,
    keyId: string,
    embed?: any
) {
    const txObj = await handleTxObj(address, toAddress, amount);
    const { preSignTxHashes, psbt } = await generatePreSignTxHash(
        txObj,
        address,
        pubkey,
        embed
    );

    console.log("Generated hashes to sign:", preSignTxHashes);

    const generatedSigns = [];
    for (let i = 0; i < preSignTxHashes.length; i++) {
        console.log(`Calling signBTCTransaction with hash ${i}:`, preSignTxHashes[i]);
        const generatedSign = await signBTCTransaction(preSignTxHashes[i], keyId);
        if (generatedSign) {
            console.log(`Received signature ${i}:`, generatedSign);
            generatedSigns.push(generatedSign);
        }
    }
    try {
        if (generatedSigns.length) {
            const response = await broadCastTx(generatedSigns, psbt, pubkey);
            return response;
        }
    } catch (e) {
        console.error("Broadcast error:", e);
        throw e;
    }
}

const handleTxObj = async (address: string, toAddress: string, amount: number) => {
    try {
        let utxos = await getUtxos(address);
        utxos = utxos.filter((v) => v.height !== UNCONFIRMED_HEIGHT);
        const outputAmount = amount;
        const feeRate = 1000; // Increased fee rate for better relay
        const outputs = [
            {
                address: toAddress,
                amount: outputAmount
            }
        ];

        const { selectedUtxos, totalValue } = selectUtxos(utxos, outputAmount);

        return {
            fromAddress: address,
            utxos: selectedUtxos,
            outputs,
            feeRate,
            toAddress: toAddress
        };
    } catch (error) {
        console.error("handleTxObj error:", error);
        throw error;
    }
};

export function selectUtxos(utxos, targetAmount) {
    utxos.sort((a, b) => b.value - a.value);
    const selectedUtxos = [];
    let totalValue = 0;

    for (const utxo of utxos) {
        selectedUtxos.push(utxo);
        totalValue += utxo.value;
        if (totalValue >= targetAmount) break;
    }

    if (totalValue < targetAmount) {
        throw new Error("Insufficient UTXOs to cover the target amount");
    }

    return { selectedUtxos, totalValue };
}

export const generatePreSignTxHash = async (txObject, fromAddress, pubkey, embed) => {
    const network = networks.testnet;
    const psbt = new Psbt({ network });

    try {
        const { utxos, outputs, feeRate } = txObject;
        let inputSum = 0;

        console.log("fromAddress:", fromAddress);
        console.log("pubkey:", pubkey);

        // Detect address type
        const addressType = getAddressType(fromAddress);
        console.log('Detected address type:', addressType);
        
        if (addressType === 'UNKNOWN') {
            throw new Error('Unsupported address type. Only P2WPKH and P2TR are supported.');
        }

        // Handle address-specific logic
        let pubkeyHashFromAddress: Buffer | null = null;
        if (addressType === 'P2WPKH') {
            try {
                const decoded = address.fromBech32(fromAddress);
                if (decoded.version === 0 && decoded.data.length === 20) {
                    pubkeyHashFromAddress = Buffer.from(decoded.data);
                    console.log(
                        "Extracted pubkeyHash from P2WPKH address:",
                        pubkeyHashFromAddress.toString("hex")
                    );
                } else {
                    throw new Error("Invalid P2WPKH address format");
                }
            } catch (e) {
                console.error("Failed to decode P2WPKH address:", e);
                throw new Error("Invalid P2WPKH address");
            }
        }

        // Verify that the provided pubkey matches the address
        const pubkeyBuffer = Buffer.from(pubkey.replace("0x", ""), "hex");
        
        if (addressType === 'P2WPKH' && pubkeyHashFromAddress) {
            const pubkeyHashFromPubkey = require("crypto")
                .createHash("ripemd160")
                .update(require("crypto").createHash("sha256").update(pubkeyBuffer).digest())
                .digest();

            console.log(
                "PubkeyHash from provided pubkey:",
                pubkeyHashFromPubkey.toString("hex")
            );
            console.log("PubkeyHash from address:", pubkeyHashFromAddress.toString("hex"));

            if (!pubkeyHashFromAddress.equals(pubkeyHashFromPubkey)) {
                console.error(
                    "❌ MISMATCH: The provided public key does not match the P2WPKH address!"
                );
                throw new Error("Public key does not match the provided P2WPKH address");
            } else {
                console.log("✅ Public key matches the P2WPKH address");
            }
        } else if (addressType === 'P2TR') {
            // For Taproot, verify the public key matches the address
            try {
                const decoded = address.fromBech32(fromAddress);
                if (decoded.version === 1 && decoded.data.length === 32) {
                    const tweakedPubkey = Buffer.from(decoded.data);
                    const internalPubkey = toXOnly(pubkeyBuffer);
                    console.log("Taproot tweaked pubkey from address:", tweakedPubkey.toString("hex"));
                    console.log("Internal pubkey (x-only):", internalPubkey.toString("hex"));
                    console.log("✅ Using Taproot address with internal pubkey");
                } else {
                    throw new Error("Invalid P2TR address format");
                }
            } catch (e) {
                console.error("Failed to decode P2TR address:", e);
                throw new Error("Invalid P2TR address");
            }
        }

        // Add inputs
        for (const utxo of utxos) {
            inputSum += utxo.value;

            const scriptPubKey = address.toOutputScript(fromAddress, network);
            console.log(
                `Input ${utxos.indexOf(utxo)} scriptPubKey:`,
                scriptPubKey.toString("hex")
            );

            const inputConfig: any = {
                hash: utxo.txid,
                index: utxo.vout,
                witnessUtxo: {
                    script: scriptPubKey,
                    value: utxo.value
                }
            };
            
            // Add Taproot-specific configuration
            if (addressType === 'P2TR') {
                const xOnlyPubkey = toXOnly(pubkeyBuffer);
                inputConfig.tapInternalKey = xOnlyPubkey;
                console.log(`Added tapInternalKey for input ${utxos.indexOf(utxo)}:`, xOnlyPubkey.toString('hex'));
            }
            
            psbt.addInput(inputConfig);
        }

        // Add outputs
        for (const output of outputs) {
            psbt.addOutput({
                address: output.address,
                value: output.amount
            });
        }

        if (embed) {
            psbt.addOutput({
                script: embed.output,
                value: 0 // OP_RETURN outputs have 0 value
            });
        }

        // Add change output
        const totalOutputAmount = outputs.reduce((sum, output) => sum + output.amount, 0);
        const changeAmount = inputSum - totalOutputAmount - feeRate;

        if (changeAmount > 546) {
            // Dust threshold
            psbt.addOutput({
                address: fromAddress,
                value: changeAmount
            });
        }

        // Generate signing hashes based on address type
        const unsignedTx = Transaction.fromBuffer(
            psbt.data.globalMap.unsignedTx.toBuffer()
        );

        let scriptCode: Buffer | undefined;
        if (addressType === 'P2WPKH' && pubkeyHashFromAddress) {
            // P2WPKH scriptCode is OP_DUP OP_HASH160 <pubkeyHash> OP_EQUALVERIFY OP_CHECKSIG
            scriptCode = Buffer.concat([
                Buffer.from([0x76]), // OP_DUP
                Buffer.from([0xa9]), // OP_HASH160
                Buffer.from([0x14]), // Push 20 bytes
                pubkeyHashFromAddress, // Use the pubkeyHash extracted from address
                Buffer.from([0x88]), // OP_EQUALVERIFY
                Buffer.from([0xac]) // OP_CHECKSIG
            ]);
            console.log("scriptCode for P2WPKH:", scriptCode.toString("hex"));
        }

        // Generate signing hashes based on address type
        const preSignTxHashes = psbt.data.inputs.map((input, index) => {
            if (addressType === 'P2WPKH' && scriptCode) {
                // For P2WPKH, construct the BIP-143 preimage for Sha256D signing
                const correctHash = unsignedTx.hashForWitnessV0(
                    index,
                    scriptCode,
                    input.witnessUtxo.value,
                    Transaction.SIGHASH_ALL
                );
                console.log(`P2WPKH hash for input ${index}:`, correctHash.toString("hex"));

                // Construct BIP-143 preimage for Sha256D
                try {
                    const version = Buffer.allocUnsafe(4);
                    version.writeUInt32LE(unsignedTx.version, 0);

                    // hashPrevouts
                    let prevoutsBuf = Buffer.alloc(0);
                    for (const inp of unsignedTx.ins) {
                        prevoutsBuf = Buffer.concat([prevoutsBuf, inp.hash]);
                        const vout = Buffer.allocUnsafe(4);
                        vout.writeUInt32LE(inp.index, 0);
                        prevoutsBuf = Buffer.concat([prevoutsBuf, vout]);
                    }
                    const hashPrevouts = require("crypto")
                        .createHash("sha256")
                        .update(require("crypto").createHash("sha256").update(prevoutsBuf).digest())
                        .digest();

                    // hashSequence
                    let sequenceBuf = Buffer.alloc(0);
                    for (const inp of unsignedTx.ins) {
                        const seq = Buffer.allocUnsafe(4);
                        seq.writeUInt32LE(inp.sequence, 0);
                        sequenceBuf = Buffer.concat([sequenceBuf, seq]);
                    }
                    const hashSequence = require("crypto")
                        .createHash("sha256")
                        .update(require("crypto").createHash("sha256").update(sequenceBuf).digest())
                        .digest();

                    // Current input outpoint
                    const outpoint = Buffer.concat([
                        unsignedTx.ins[index].hash,
                        (() => {
                            const buf = Buffer.allocUnsafe(4);
                            buf.writeUInt32LE(unsignedTx.ins[index].index, 0);
                            return buf;
                        })()
                    ]);

                    // scriptCode with length prefix
                    const scriptCodeWithLength = Buffer.concat([
                        Buffer.from([scriptCode.length]),
                        scriptCode
                    ]);

                    // amount (8 bytes, little endian)
                    const amount = Buffer.allocUnsafe(8);
                    amount.writeBigUInt64LE(BigInt(input.witnessUtxo.value), 0);

                    // nSequence of current input
                    const nSequence = Buffer.allocUnsafe(4);
                    nSequence.writeUInt32LE(unsignedTx.ins[index].sequence, 0);

                    // hashOutputs
                    let outputsBuf = Buffer.alloc(0);
                    for (const out of unsignedTx.outs) {
                        const val = Buffer.allocUnsafe(8);
                        val.writeBigUInt64LE(BigInt(out.value), 0);
                        outputsBuf = Buffer.concat([outputsBuf, val]);
                        outputsBuf = Buffer.concat([outputsBuf, Buffer.from([out.script.length])]);
                        outputsBuf = Buffer.concat([outputsBuf, out.script]);
                    }
                    const hashOutputs = require("crypto")
                        .createHash("sha256")
                        .update(require("crypto").createHash("sha256").update(outputsBuf).digest())
                        .digest();

                    // nLockTime
                    const nLockTime = Buffer.allocUnsafe(4);
                    nLockTime.writeUInt32LE(unsignedTx.locktime, 0);

                    // sighash type
                    const sighashType = Buffer.allocUnsafe(4);
                    sighashType.writeUInt32LE(Transaction.SIGHASH_ALL, 0);

                    // Construct preimage
                    const preimage = Buffer.concat([
                        version, hashPrevouts, hashSequence, outpoint,
                        scriptCodeWithLength, amount, nSequence, hashOutputs,
                        nLockTime, sighashType
                    ]);

                    // Verify preimage is correct
                    const testHash = require("crypto")
                        .createHash("sha256")
                        .update(require("crypto").createHash("sha256").update(preimage).digest())
                        .digest();

                    console.log(`Preimage: ${preimage.toString("hex")}`);
                    console.log(`Test hash: ${testHash.toString("hex")}`);
                    console.log(`Expected:  ${correctHash.toString("hex")}`);
                    console.log(`Match: ${testHash.equals(correctHash)}`);

                    if (testHash.equals(correctHash)) {
                        console.log("✅ Preimage is correct!");
                        return `0x${preimage.toString("hex")}`;
                    } else {
                        throw new Error("Preimage construction failed");
                    }
                } catch (error) {
                    console.error("Error constructing P2WPKH preimage:", error);
                    throw error;
                }
            } else if (addressType === 'P2TR') {
                // For Taproot (P2TR), use hashForWitnessV1 exactly like reference code
                const hash = unsignedTx.hashForWitnessV1(
                    index,
                    [input.witnessUtxo.script],
                    [input.witnessUtxo.value],
                    Transaction.SIGHASH_DEFAULT
                );
                
                console.log(`P2TR hash for input ${index}:`, hash.toString("hex"));
                return `0x${hash.toString("hex")}`;
            } else {
                throw new Error(`Unsupported address type: ${addressType}`);
            }
        });

        return { preSignTxHashes, psbt };
    } catch (error) {
        console.error("Error in generatePreSignTxHash:", error);
        throw error;
    }
};

export const broadCastTx = async (
    signatures: any[],
    psbtInstance: Psbt,
    pubkey: string
) => {
    if (!signatures.length) {
        throw new Error("No signatures provided");
    }

    // Check if this involves Taproot addresses
    const firstInput = psbtInstance.data.inputs[0];
    const isTaproot = firstInput && firstInput.tapInternalKey;
    
    if (isTaproot) {
        // Use PSBT finalization for Taproot
        return await taprootBroadcast(signatures, psbtInstance, pubkey);
    } else {
        // Use manual witness construction for P2WPKH
        return await manualWitnessConstruction(signatures, psbtInstance, pubkey);
    }
};

// Taproot transaction broadcast function - matching reference code
const taprootBroadcast = async (
    signatures: any[],
    psbtInstance: Psbt,
    pubkey: string
) => {
    console.log("Starting Taproot transaction broadcast...");
    
    if (!signatures.length) {
        throw new Error('No signatures provided');
    }

    try {
        // Match reference code exactly
        signatures.forEach((sig: any, index: number) => {
            const sigBuffer = Buffer.from(sig.sign.replace('0x', ''), 'hex');
            console.log(`Taproot signature ${index}: ${sigBuffer.toString("hex")} (${sigBuffer.length} bytes)`);
            
            psbtInstance.updateInput(index, {
                tapKeySig: sigBuffer
            });
        });

        psbtInstance.finalizeAllInputs();
        const tx = psbtInstance.extractTransaction(true);
        const rawTx = tx.toHex();
        
        console.log("Taproot transaction hex:", rawTx);
        return await pushTx(rawTx);

    } catch (error) {
        console.error('Failed to broadcast Taproot transaction:', error);
        throw error;
    }
};

// Fallback function for manual witness construction
const manualWitnessConstruction = async (
    signatures: any[],
    psbtInstance: Psbt,
    pubkey
) => {
    console.log("Starting manual witness construction...");

    try {
        // Get transaction data without calling extractTransaction
        const psbtData = psbtInstance.data;
        const unsignedTxBuffer = psbtData.globalMap.unsignedTx.toBuffer();
        const unsignedTx = Transaction.fromBuffer(unsignedTxBuffer);

        console.log("Unsigned tx hex:", unsignedTx.toHex());

        // Let's also verify what hash we should be signing for this transaction
        console.log(
            "=== VERIFICATION: Recalculating the hash that should have been signed ==="
        );

        // Get the first input's witnessUtxo info
        const firstInput = psbtData.inputs[0];
        if (firstInput && firstInput.witnessUtxo) {
            console.log("First input witnessUtxo value:", firstInput.witnessUtxo.value);
            console.log(
                "First input witnessUtxo script:",
                Buffer.from(firstInput.witnessUtxo.script).toString("hex")
            );

            // Extract pubkey hash from the script (should be the same as address)
            const scriptBuffer = Buffer.from(firstInput.witnessUtxo.script);
            if (
                scriptBuffer.length === 22 &&
                scriptBuffer[0] === 0x00 &&
                scriptBuffer[1] === 0x14
            ) {
                const pubkeyHash = scriptBuffer.slice(2);
                console.log("Pubkey hash from script:", pubkeyHash.toString("hex"));

                // Recreate the scriptCode
                const scriptCode = Buffer.concat([
                    Buffer.from([0x76, 0xa9, 0x14]), // OP_DUP OP_HASH160 <20>
                    pubkeyHash,
                    Buffer.from([0x88, 0xac]) // OP_EQUALVERIFY OP_CHECKSIG
                ]);

                console.log("Reconstructed scriptCode:", scriptCode.toString("hex"));

                // Calculate the hash that should have been signed
                const expectedHash = unsignedTx.hashForWitnessV0(
                    0, // first input
                    scriptCode,
                    firstInput.witnessUtxo.value,
                    Transaction.SIGHASH_ALL
                );

                console.log("Expected hash for signature:", expectedHash.toString("hex"));
                console.log(
                    "Hash we generated earlier: 4e6f4004918be121e328b4c9a7dd23f749b8cf0671425922b6ee4d1cc8e52665"
                );
                console.log(
                    "Hashes match:",
                    expectedHash.toString("hex") ===
                        "4e6f4004918be121e328b4c9a7dd23f749b8cf0671425922b6ee4d1cc8e52665"
                );
            }
        }

        console.log("=== END VERIFICATION ===");

        // Create a new transaction from the hex to ensure it's clean
        const cleanTx = Transaction.fromHex(unsignedTx.toHex());

        // Add witness data to each input
        signatures.forEach((sig: any, index: number) => {
            const sigHex = sig.sign.replace("0x", "");
            const pubkeyHex = pubkey.replace("0x", "") || "";

            let sigBuffer = Buffer.from(sigHex, "hex");
            const pubkeyBuffer = Buffer.from(pubkeyHex, "hex");

            console.log(`Original signature length: ${sigBuffer.length} bytes`);
            console.log(`Original signature: ${sigBuffer.toString("hex")}`);

            // Convert signature to DER format using ecdsa-sig-formatter
            try {
                if (sigBuffer.length === 64) {
                    // Raw signature format (32 bytes r + 32 bytes s)
                    const derSig = ecdsaSigFormatter.joseToDer(sigBuffer, "ES256");
                    sigBuffer = Buffer.from(derSig);
                    console.log(
                        `Converted raw signature to DER: ${sigBuffer.toString("hex")}`
                    );
                } else if (sigBuffer.length === 65) {
                    // Compact signature format - remove recovery byte and convert
                    const rawSig = sigBuffer.slice(0, 64); // Remove recovery byte
                    const derSig = ecdsaSigFormatter.joseToDer(rawSig, "ES256");
                    sigBuffer = Buffer.from(derSig);
                    console.log(
                        `Converted compact signature to DER: ${sigBuffer.toString("hex")}`
                    );
                } else {
                    // Assume it's already in DER format
                    console.log(
                        `Signature length ${sigBuffer.length} - assuming DER format`
                    );
                }
            } catch (conversionError) {
                console.warn("Failed to convert signature format:", conversionError);
                console.log("Using original signature format");
            }

            // Add SIGHASH_ALL byte (0x01) for native SegWit
            const sigWithHashType = Buffer.concat([sigBuffer, Buffer.from([0x01])]);

            console.log(`Setting witness for input ${index}:`, {
                signature: sigWithHashType.toString("hex"),
                pubkey: pubkeyBuffer.toString("hex"),
                signatureLength: sigWithHashType.length
            });

            // Set witness data directly on the transaction input
            if (!cleanTx.ins[index].witness) {
                cleanTx.ins[index].witness = [];
            }

            // For P2WPKH: witness = [signature, pubkey]
            cleanTx.ins[index].witness = [sigWithHashType, pubkeyBuffer];
        });

        const rawTx = cleanTx.toHex();
        console.log("Manual witness transaction:", rawTx);

        return await pushTx(rawTx);
    } catch (error) {
        console.error("Manual witness construction failed:", error);
        throw error;
    }
};

export const pushTx = async (rawtx: string) => {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: rawtx
    };
    return fetch(`${process.env.BTC_ESPLORA_API}/tx`, requestOptions)
        .then(async (response) => {
            try {
                const resText = await response.text();
                try {
                    // Attempt to parse the response as JSON
                    const jsonResponse = JSON.parse(resText);
                    console.log("Transaction broadcast response (JSON):", jsonResponse);
                    return jsonResponse; // Return JSON object
                } catch (error) {
                    // If parsing fails, handle it as plain text
                    console.log("Transaction broadcast response (text):", resText);
                    return resText; // Return plain text
                }
            } catch (error) {
                return "";
                // If parsing fails, handle it as plain text
                console.log("Transaction broadcast response (text):", response);
            }
        })
        .catch((error) => {
            console.error(error);
            throw error;
        });
};

export const getUtxos = async (address: string): Promise<any> => {
    try {
        const endpoint = `${process.env.BTC_ESPLORA_API}/address/${address}/utxo`;
        const resp = await fetch(endpoint, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });
        if (!resp.ok) {
            throw new Error(`HTTP error! status: ${resp.status}`);
        }
        return await resp.json();
    } catch (error) {
        console.error("Get UTXOs error:", error);
        throw error;
    }
};

export { btcSendTransaction };
