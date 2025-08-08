import crypto from "crypto";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import { ECPairFactory } from "ecpair";

function encodeText(text) {
    return new TextEncoder().encode(text);
}

// Function to convert Array Buffer to hex string
function toHexString(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

export async function bytes32BTC(bitcoinAddress: string) {
    const msgBuffer = encodeText(bitcoinAddress);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashHex = toHexString(hashBuffer);
    return "0x" + hashHex;
}

export function satsToBtc(sats: any) {
    //@ts-ignore
    const satsToBtcRatio = 100000000n;

    if (typeof sats !== "bigint") {
        // Convert to BigInt if not already
        sats = BigInt(sats);
    }

    // Convert to string to handle decimal places
    const wholePart = sats / satsToBtcRatio;
    const fractionalPart = sats % satsToBtcRatio;

    // Create a string representation with proper padding
    let fractionalStr = fractionalPart.toString().padStart(8, "0");

    // Create the full number as a string
    let result = `${wholePart}.${fractionalStr}`;

    // Remove trailing zeros and decimal point if needed
    result = result.replace(/\.?0+$/, "");

    return result;
}

export function btcToSats(btc: number): number {
    const satoshiPerBtc = 100_000_000; // 1 BTC = 100,000,000 Satoshi
    return btc * satoshiPerBtc;
}

export async function getOpReturnDataFromTx(tx: any) {
    try {
        // Find all OP_RETURN outputs and extract data
        const opReturnData = [];

        tx.outs.forEach((output: any) => {
            try {
                // Check if this is an OP_RETURN output
                const chunks = bitcoin.script.decompile(output.script);

                if (
                    chunks &&
                    chunks.length > 1 &&
                    chunks[0] === bitcoin.opcodes.OP_RETURN
                ) {
                    // Extract data after OP_RETURN
                    for (let i = 1; i < chunks.length; i++) {
                        if (Buffer.isBuffer(chunks[i])) {
                            opReturnData.push(chunks[i]);
                        }
                    }
                }
            } catch (e) {
                console.error("Error parsing output:", e);
            }
        });

        return opReturnData;
    } catch (error) {
        console.error("Error retrieving transaction:", error);
        throw error;
    }
}

bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

export function getBitcoinAddressesFromPemKey(pemKey: string, network: 'mainnet' | 'testnet' = 'testnet') {
    try {
        // Remove PEM header/footer and decode base64
        const base64Key = pemKey
            .replace(/-----BEGIN PUBLIC KEY-----/g, '')
            .replace(/-----END PUBLIC KEY-----/g, '')
            .replace(/-----BEGIN EC PUBLIC KEY-----/g, '')
            .replace(/-----END EC PUBLIC KEY-----/g, '')
            .replace(/\n/g, '')
            .replace(/\r/g, '')
            .trim();
        
        const publicKeyBuffer = Buffer.from(base64Key, 'base64');
        console.log('Public key buffer length:', publicKeyBuffer.length);
        
        let publicKeyBytes: Buffer;
        
        // Handle different DER formats
        if (publicKeyBuffer.length === 65 && (publicKeyBuffer[0] === 0x04 || publicKeyBuffer[0] === 0x02 || publicKeyBuffer[0] === 0x03)) {
            // Raw uncompressed (0x04) or compressed (0x02/0x03) public key
            publicKeyBytes = publicKeyBuffer;
        } else if (publicKeyBuffer.length === 33 && (publicKeyBuffer[0] === 0x02 || publicKeyBuffer[0] === 0x03)) {
            // Raw compressed public key
            publicKeyBytes = publicKeyBuffer;
        } else if (publicKeyBuffer.length === 91) {
            // Standard DER format with ASN.1 header (uncompressed)
            publicKeyBytes = Buffer.from(publicKeyBuffer.subarray(26));
        } else if (publicKeyBuffer.length === 59) {
            // Standard DER format with ASN.1 header (compressed)
            publicKeyBytes = Buffer.from(publicKeyBuffer.subarray(26));
        } else if (publicKeyBuffer.length === 88) {
            // Alternative DER format
            publicKeyBytes = Buffer.from(publicKeyBuffer.subarray(23));
        } else if (publicKeyBuffer.length === 56) {
            // Alternative DER format (compressed)
            publicKeyBytes = Buffer.from(publicKeyBuffer.subarray(23));
        } else {
            // Try to find the public key by looking for the 0x04, 0x02, or 0x03 prefix
            let found = false;
            for (let i = 0; i < publicKeyBuffer.length - 32; i++) {
                if (publicKeyBuffer[i] === 0x04 && publicKeyBuffer.length - i >= 65) {
                    publicKeyBytes = Buffer.from(publicKeyBuffer.subarray(i, i + 65));
                    found = true;
                    break;
                } else if ((publicKeyBuffer[i] === 0x02 || publicKeyBuffer[i] === 0x03) && publicKeyBuffer.length - i >= 33) {
                    publicKeyBytes = Buffer.from(publicKeyBuffer.subarray(i, i + 33));
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                throw new Error(`Invalid public key format. Buffer length: ${publicKeyBuffer.length}. Expected lengths: 33, 56, 59, 65, 88, or 91 bytes.`);
            }
        }
        
        console.log('Extracted public key bytes length:', publicKeyBytes.length);
        console.log('Public key bytes (hex):', publicKeyBytes.toString('hex'));
        
        // Create ECPair from public key
        const keyPair = ECPair.fromPublicKey(publicKeyBytes);
        
        // Select network
        const btcNetwork = network === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
        
        // Generate P2WPKH address (Native SegWit)
        const p2wpkh = bitcoin.payments.p2wpkh({ 
            pubkey: Buffer.from(keyPair.publicKey),
            network: btcNetwork 
        });
        
        // Generate Taproot address (P2TR)
        const p2tr = bitcoin.payments.p2tr({ 
            pubkey: Buffer.from(keyPair.publicKey.subarray(1, 33)), // Use x-coordinate only for taproot
            network: btcNetwork 
        });
        
        const addresses = {
            p2wpkh: p2wpkh.address,
            taproot: p2tr.address,
            publicKey: Buffer.from(keyPair.publicKey).toString('hex')
        };

        console.log(addresses);

        return addresses;
        
    } catch (error) {
        console.error('Error generating Bitcoin addresses from PEM key:', error);
        throw error;
    }
}

export function validateDERSignatureWithPemKey(message: string, signature: string, pemKey: string, expectedAddress: string, network: 'mainnet' | 'testnet' = 'mainnet') {
    try {
        // First, get the P2WPKH address from the PEM key
        const addresses = getBitcoinAddressesFromPemKey(pemKey, network);
        console.log('Generated addresses from PEM key:', addresses);
        
        // Check if the expected address matches the generated P2WPKH address
        if (addresses.p2wpkh !== expectedAddress) {
            throw new Error(`Expected address ${expectedAddress} does not match generated P2WPKH address ${addresses.p2wpkh}`);
        }
        
        // Parse the DER signature
        const sigBytes = Buffer.from(signature, 'base64');
        if (sigBytes.length < 6 || sigBytes[0] !== 0x30) {
            throw new Error('Invalid DER signature format');
        }
        
        // Parse DER signature: 0x30 [total-length] 0x02 [R-length] [R] 0x02 [S-length] [S]
        let offset = 2; // Skip 0x30 and total length
        
        if (sigBytes[offset] !== 0x02) {
            throw new Error('Invalid DER signature format - expected 0x02 for R');
        }
        offset++; // Skip 0x02
        
        const rLength = sigBytes[offset];
        offset++; // Skip R length
        
        const r = sigBytes.subarray(offset, offset + rLength);
        offset += rLength;
        
        if (sigBytes[offset] !== 0x02) {
            throw new Error('Invalid DER signature format - expected 0x02 for S');
        }
        offset++; // Skip 0x02
        
        const sLength = sigBytes[offset];
        offset++; // Skip S length
        
        const s = sigBytes.subarray(offset, offset + sLength);
        
        // Remove leading zero bytes if present
        const rClean = r[0] === 0x00 && r.length > 1 ? r.subarray(1) : r;
        const sClean = s[0] === 0x00 && s.length > 1 ? s.subarray(1) : s;
        
        // Create signature buffer (64 bytes: 32 for r, 32 for s)
        const rPadded = Buffer.alloc(32);
        const sPadded = Buffer.alloc(32);
        rClean.copy(rPadded, 32 - rClean.length);
        sClean.copy(sPadded, 32 - sClean.length);
        const signatureBuffer = Buffer.concat([rPadded, sPadded]);
        
        // Handle message hash
        let messageHash: Buffer;
        if (message.startsWith('0x') && message.length === 66) {
            messageHash = Buffer.from(message.slice(2), 'hex');
        } else {
            const messagePrefix = Buffer.from('\x18Bitcoin Signed Message:\n', 'utf8');
            const messageBuffer = Buffer.from(message, 'utf8');
            const messageLengthBuffer = Buffer.alloc(1);
            messageLengthBuffer.writeUInt8(messageBuffer.length, 0);
            const fullMessage = Buffer.concat([messagePrefix, messageLengthBuffer, messageBuffer]);
            messageHash = bitcoin.crypto.hash256(fullMessage);
        }
        
        // Extract public key from PEM
        const base64Key = pemKey
            .replace(/-----BEGIN PUBLIC KEY-----/g, '')
            .replace(/-----END PUBLIC KEY-----/g, '')
            .replace(/-----BEGIN EC PUBLIC KEY-----/g, '')
            .replace(/-----END EC PUBLIC KEY-----/g, '')
            .replace(/\n/g, '')
            .replace(/\r/g, '')
            .trim();
        
        const publicKeyBuffer = Buffer.from(base64Key, 'base64');
        let publicKeyBytes: Buffer;
        
        // Extract the public key (similar logic as in getBitcoinAddressesFromPemKey)
        if (publicKeyBuffer.length === 65 && (publicKeyBuffer[0] === 0x04 || publicKeyBuffer[0] === 0x02 || publicKeyBuffer[0] === 0x03)) {
            publicKeyBytes = publicKeyBuffer;
        } else if (publicKeyBuffer.length === 33 && (publicKeyBuffer[0] === 0x02 || publicKeyBuffer[0] === 0x03)) {
            publicKeyBytes = publicKeyBuffer;
        } else if (publicKeyBuffer.length === 91) {
            publicKeyBytes = Buffer.from(publicKeyBuffer.subarray(26));
        } else if (publicKeyBuffer.length === 59) {
            publicKeyBytes = Buffer.from(publicKeyBuffer.subarray(26));
        } else if (publicKeyBuffer.length === 88) {
            // Alternative DER format
            publicKeyBytes = Buffer.from(publicKeyBuffer.subarray(23));
        } else if (publicKeyBuffer.length === 56) {
            // Alternative DER format (compressed)
            publicKeyBytes = Buffer.from(publicKeyBuffer.subarray(23));
        } else {
            // Try to find the public key by looking for the 0x04, 0x02, or 0x03 prefix
            let found = false;
            for (let i = 0; i < publicKeyBuffer.length - 32; i++) {
                if (publicKeyBuffer[i] === 0x04 && publicKeyBuffer.length - i >= 65) {
                    publicKeyBytes = Buffer.from(publicKeyBuffer.subarray(i, i + 65));
                    found = true;
                    break;
                } else if ((publicKeyBuffer[i] === 0x02 || publicKeyBuffer[i] === 0x03) && publicKeyBuffer.length - i >= 33) {
                    publicKeyBytes = Buffer.from(publicKeyBuffer.subarray(i, i + 33));
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                throw new Error(`Unsupported public key format for signature validation. Buffer length: ${publicKeyBuffer.length}`);
            }
        }
        
        // Verify the signature using the public key
        const isValid = ecc.verify(messageHash, publicKeyBytes, signatureBuffer);
        
        return {
            isValid,
            address: addresses.p2wpkh,
            publicKey: publicKeyBytes.toString('hex')
        };
        
    } catch (error) {
        console.error('Error validating DER signature:', error);
        throw error;
    }
}

export function validateTaprootSignature(message: string, signature: string, pemKey: string, network: 'mainnet' | 'testnet' = 'testnet') {
    try {
        // First, get the Taproot address from the PEM key
        const addresses = getBitcoinAddressesFromPemKey(pemKey, network);
        console.log('Generated addresses from PEM key:', addresses);
        console.log('Will validate signature against taproot address:', addresses.taproot);
        
        // Parse combined signature (128 hex chars = 64 bytes = 32 bytes R + 32 bytes S)
        let cleanSignature = signature.startsWith('0x') ? signature.slice(2) : signature;
        
        if (cleanSignature.length !== 128) {
            throw new Error(`Invalid signature length. Expected 128 hex characters, got ${cleanSignature.length}`);
        }
        
        // Split into R and S components (32 bytes each)
        const rHex = cleanSignature.slice(0, 64);   // First 32 bytes (64 hex chars)
        const sHex = cleanSignature.slice(64, 128); // Second 32 bytes (64 hex chars)
        
        const rBuffer = Buffer.from(rHex, 'hex');
        const sBuffer = Buffer.from(sHex, 'hex');
        
        console.log('R component (hex):', rHex);
        console.log('S component (hex):', sHex);
        
        // Create 64-byte signature for Schnorr (r + s)
        const signatureBuffer = Buffer.concat([rBuffer, sBuffer]);
        
        // Handle message hash
        let messageHash: Buffer;
        if (message.startsWith('0x') && message.length === 66) {
            messageHash = Buffer.from(message.slice(2), 'hex');
        } else {
            const messagePrefix = Buffer.from('\x18Bitcoin Signed Message:\n', 'utf8');
            const messageBuffer = Buffer.from(message, 'utf8');
            const messageLengthBuffer = Buffer.alloc(1);
            messageLengthBuffer.writeUInt8(messageBuffer.length, 0);
            const fullMessage = Buffer.concat([messagePrefix, messageLengthBuffer, messageBuffer]);
            messageHash = bitcoin.crypto.hash256(fullMessage);
        }
        
        // Extract public key from PEM
        const base64Key = pemKey
            .replace(/-----BEGIN PUBLIC KEY-----/g, '')
            .replace(/-----END PUBLIC KEY-----/g, '')
            .replace(/-----BEGIN EC PUBLIC KEY-----/g, '')
            .replace(/-----END EC PUBLIC KEY-----/g, '')
            .replace(/\n/g, '')
            .replace(/\r/g, '')
            .trim();
        
        const publicKeyBuffer = Buffer.from(base64Key, 'base64');
        let publicKeyBytes: Buffer;
        
        // Extract the public key
        if (publicKeyBuffer.length === 65 && (publicKeyBuffer[0] === 0x04 || publicKeyBuffer[0] === 0x02 || publicKeyBuffer[0] === 0x03)) {
            publicKeyBytes = publicKeyBuffer;
        } else if (publicKeyBuffer.length === 33 && (publicKeyBuffer[0] === 0x02 || publicKeyBuffer[0] === 0x03)) {
            publicKeyBytes = publicKeyBuffer;
        } else if (publicKeyBuffer.length === 91) {
            publicKeyBytes = Buffer.from(publicKeyBuffer.subarray(26));
        } else if (publicKeyBuffer.length === 59) {
            publicKeyBytes = Buffer.from(publicKeyBuffer.subarray(26));
        } else if (publicKeyBuffer.length === 88) {
            publicKeyBytes = Buffer.from(publicKeyBuffer.subarray(23));
        } else if (publicKeyBuffer.length === 56) {
            publicKeyBytes = Buffer.from(publicKeyBuffer.subarray(23));
        } else {
            throw new Error(`Unsupported public key format for Taproot validation. Buffer length: ${publicKeyBuffer.length}`);
        }
        
        // For Taproot, we need the x-coordinate only (32 bytes)
        let xOnlyPublicKey: Buffer;
        if (publicKeyBytes.length === 65 && publicKeyBytes[0] === 0x04) {
            // Uncompressed key - take x coordinate (bytes 1-32)
            xOnlyPublicKey = Buffer.from(publicKeyBytes.subarray(1, 33));
        } else if (publicKeyBytes.length === 33 && (publicKeyBytes[0] === 0x02 || publicKeyBytes[0] === 0x03)) {
            // Compressed key - take x coordinate (bytes 1-32)
            xOnlyPublicKey = Buffer.from(publicKeyBytes.subarray(1, 33));
        } else {
            throw new Error('Invalid public key format for Taproot');
        }
        
        console.log('X-only public key:', xOnlyPublicKey.toString('hex'));
        console.log('Message hash:', messageHash.toString('hex'));
        console.log('Signature:', signatureBuffer.toString('hex'));
        
        // Verify Schnorr signature for Taproot
        // Note: This is a simplified verification - actual Taproot verification is more complex
        // For proper Taproot signature verification, you would use BIP-340 Schnorr signature scheme
        try {
            // Try to verify using the x-only public key
            const isValid = ecc.verifySchnorr ? 
                ecc.verifySchnorr(messageHash, xOnlyPublicKey, signatureBuffer) :
                false; // Fallback if Schnorr verification is not available
            
            return {
                isValid,
                address: addresses.taproot,
                xOnlyPublicKey: xOnlyPublicKey.toString('hex'),
                rComponent: rHex,
                sComponent: sHex
            };
        } catch (verifyError) {
            console.log('Schnorr verification failed:', verifyError.message);
            return {
                isValid: false,
                address: addresses.taproot,
                xOnlyPublicKey: xOnlyPublicKey.toString('hex'),
                rComponent: rHex,
                sComponent: sHex,
                error: verifyError.message
            };
        }
        
    } catch (error) {
        console.error('Error validating Taproot signature:', error);
        throw error;
    }
}
