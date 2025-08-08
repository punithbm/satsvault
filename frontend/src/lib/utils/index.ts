import * as bitcoin from "bitcoinjs-lib";
import { script, crypto as bcrypto } from "bitcoinjs-lib";
import { doubleSHA256 } from "../utils";
import * as crypto from "crypto";

export function selectUtxos(utxos: any, targetAmount: any) {
  // Sort UTXOs by value in descending order
  utxos.sort((a: { value: number }, b: { value: number }) => b.value - a.value);

  const selectedUtxos = [];
  let totalValue = 0;

  for (const utxo of utxos) {
    if (totalValue >= targetAmount) {
      break;
    }
    selectedUtxos.push(utxo);
    totalValue += utxo.value;
  }

  if (totalValue < targetAmount) {
    throw new Error("Insufficient UTXOs to cover the target amount");
  }

  return {
    selectedUtxos,
    totalValue,
  };
}

export const createPsbt = async (
  senderAddress: string,
  recipientAddress: string,
  amount: number,
  utxos: any[],
  feeRateMultiplier: number
) => {
  try {
    // Debug: Check if we have UTXOs
    if (!utxos.length) {
      throw new Error("No UTXOs available");
    }

    // Initialize PSBT with testnet network (for signet)
    const psbt = new bitcoin.Psbt({ network: bitcoin.networks.testnet });

    // Calculate total input amount and fee
    const feeRate = 1;
    const estimatedFee = feeRateMultiplier * feeRate; // Rough estimate for a simple tx

    const { selectedUtxos, totalValue } = selectUtxos(
      utxos,
      amount + estimatedFee
    );

    const inputAmount = totalValue;

    if (inputAmount < amount + estimatedFee) {
      throw new Error(
        `Insufficient funds: have ${inputAmount}, need ${amount + estimatedFee}`
      );
    }

    // Add inputs
    for (const utxo of selectedUtxos) {
      try {
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            script: bitcoin.address.toOutputScript(
              senderAddress,
              bitcoin.networks.testnet
            ),
            value: utxo.value,
          },
          // nonWitnessUtxo: Buffer.from(txHex, "hex"),
        });
      } catch (e) {
        console.error("Failed to add input:", e);
        throw e;
      }
    }

    // Add outputs
    psbt.addOutput({
      address: recipientAddress,
      value: amount,
    });

    // Add change output if necessary
    const changeAmount = inputAmount - amount - estimatedFee;
    if (changeAmount > 546) {
      // dust threshold
      psbt.addOutput({
        address: senderAddress,
        value: changeAmount,
      });
    }

    // Convert to hex string
    const psbtHex = psbt.toBase64();
    return psbtHex;
  } catch (error) {
    console.error("Error creating PSBT:", error);
    throw error;
  }
};

export const createStakeTimelockScript = (recipientPubKey: Buffer) => {
  const delayBlocks = parseInt(
    process.env.NEXT_PUBLIC_DELAY_BLOCKS ?? "10",
    10
  );
  return script.compile([
    script.number.encode(delayBlocks), // Block delay height
    script.OPS.OP_CHECKSEQUENCEVERIFY, // Enforce timelock
    script.OPS.OP_DROP, // Clean up the stack
    recipientPubKey, // Recipient's public key
    script.OPS.OP_CHECKSIG, // Check recipient's signature
  ]);
};

export const createBridgeScript = ({
  signingGroupPubKeyHash,
  refundPubKey,
  address,
  destinationChainId,
  blindingFactor,
}: {
  signingGroupPubKeyHash: Buffer;
  refundPubKey: Buffer;
  address: Buffer;
  destinationChainId: Buffer;
  blindingFactor: Buffer;
}) => {
  const refundPubKeyHash = bcrypto.hash160(refundPubKey);
  const delayBlocks = 2400;

  return script.compile([
    address, // <address>
    script.OPS.OP_DROP,
    destinationChainId, // <destination-chain-id>
    script.OPS.OP_DROP,
    blindingFactor, // <blinding-factor>
    script.OPS.OP_DROP,

    script.OPS.OP_DUP,
    script.OPS.OP_HASH160,
    signingGroupPubKeyHash,
    script.OPS.OP_EQUAL,

    script.OPS.OP_IF,
    script.OPS.OP_CHECKSIG,
    script.OPS.OP_ELSE,
    script.OPS.OP_DUP,
    script.OPS.OP_HASH160,
    refundPubKeyHash,
    script.OPS.OP_EQUALVERIFY,
    script.number.encode(delayBlocks),
    script.OPS.OP_CHECKSEQUENCEVERIFY,
    script.OPS.OP_DROP,
    script.OPS.OP_CHECKSIG,
    script.OPS.OP_ENDIF,
  ]);
};

export const createDummyScript = (recipientPubKey: Buffer) => {
  return script.compile([
    script.number.encode(5), // Just a dummy number
    script.OPS.OP_DROP, // Drop the number
    recipientPubKey, // Public key
    script.OPS.OP_CHECKSIG, // Basic signature check
  ]);
};

export function calculateMerkleProof(blockSummary: any, targetTxid: any) {
  if (!blockSummary || blockSummary.length === 0) {
    throw new Error("Block summary cannot be empty");
  }

  // Extract txids from the block summary
  const txids = blockSummary.map((tx: any) => tx.txid);

  // Find the index of the target transaction
  const txIndex = txids.indexOf(targetTxid);
  if (txIndex === -1) {
    throw new Error("Transaction ID not found in the block");
  }

  // Convert transaction IDs to Buffers in little-endian format
  let currentLevel = txids.map((txid: any) =>
    Buffer.from(txid, "hex").reverse()
  );

  const proof: any = [];
  let currentIndex = txIndex;

  while (currentLevel.length > 1) {
    const nextLevel = [];

    // Handle odd number of transactions by duplicating last one
    if (currentLevel.length % 2 !== 0) {
      currentLevel.push(currentLevel[currentLevel.length - 1]);
    }

    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i === currentIndex - (currentIndex % 2)) {
        // Store the sibling hash in the proof
        proof.push(
          currentIndex % 2 === 0 ? currentLevel[i + 1] : currentLevel[i]
        );
      }

      // Compute parent hash
      const combined = Buffer.concat([currentLevel[i], currentLevel[i + 1]]);
      nextLevel.push(doubleSHA256(combined));
    }

    // Move up in the tree
    currentLevel = nextLevel;
    currentIndex = Math.floor(currentIndex / 2);
  }

  // Convert proof hashes to hex (reverse bytes to normal order)
  return proof.map((hash: any) => hash.reverse().toString("hex"));
}

export async function getMerkleProof(txid: string[], blockHash: string) {
  try {
    const response = await fetch(`https://rpc.signet.surge.dev`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${process.env.NEXT_PUBLIC_BITCOIN_USERNAME}:${process.env.NEXT_PUBLIC_BITCOIN_PASSWORD}`
        ).toString("base64")}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "gettxoutproof",
        params: [txid, blockHash],
        id: 1,
      }),
    });

    const result = await response.json();

    if (result.error) {
      throw new Error(`RPC Error: ${JSON.stringify(result.error)}`);
    }

    return result.result;
  } catch (error) {
    console.error("Error getting merkle proof:", error);
    throw error;
  }
}

export const getBlockInfo = async (blockHash: string) => {
  try {
    const response = await fetch(
      `https://signet.surge.dev/api/block/${blockHash}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch block details");
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("Error fetching block height:", error);
    return null;
  }
};

export const getBlockHeight = async (txId: string) => {
  try {
    const response = await fetch(`https://signet.surge.dev/api/tx/${txId}`);

    if (!response.ok) {
      throw new Error("Failed to fetch transaction details");
    }

    const data = await response.json();
    return {
      blockHeight: data.status.block_height,
      blockHash: data.status.block_hash,
    };
  } catch (error: any) {
    console.error("Error fetching block height:", error);
    return null;
  }
};

export const findBlockIndex = (
  txId: string,
  blockTxs: any[]
): number | null => {
  if (!blockTxs || !Array.isArray(blockTxs)) {
    console.error("Invalid blockTxs input");
    return null;
  }

  const index = blockTxs.findIndex(
    (tx) => tx.txid.toLowerCase() === txId.toLowerCase()
  );

  return index !== -1 ? index : null;
};

export function convertToVectorU8(hexString: string): number[] {
  // Ensure the string is lowercase and remove "0x" prefix if present
  const cleanedHex = hexString.toLowerCase().replace(/^0x/, "");

  // Ensure the length is even (each byte is represented by two hex characters)
  if (cleanedHex.length % 2 !== 0) {
    throw new Error("Hex string length must be even.");
  }

  // Convert hex string to an array of numbers (Uint8)
  const byteArray: number[] = [];
  for (let i = 0; i < cleanedHex.length; i += 2) {
    byteArray.push(parseInt(cleanedHex.slice(i, i + 2), 16));
  }

  return byteArray;
}

export const getBlockTxs = async (blockHash: string) => {
  try {
    const response = await fetch(
      `https://signet.surge.dev/api/block/${blockHash}/summary`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch block details");
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("Error fetching block height:", error);
    return null;
  }
};

export function extractTxIdsFromBlockTxs(blockTxs: any[]): string[] {
  return blockTxs.map((tx) => tx.txid);
}

export function parseTxOutProof(rawProof: string) {
  console.log("raw proof from function", rawProof);
  // Ensure input is Buffer
  const proof = Buffer.isBuffer(rawProof)
    ? rawProof
    : Buffer.from(rawProof, "hex");

  // Skip header (80 bytes)
  let pos = 80;

  // Read varint tx count
  const txCount = proof[pos];
  pos += 1;

  if (txCount & 0x80) {
    // Handle larger varints if needed
    // Skipping implementation as per original
    console.log("Large varint detected");
  }

  // Skip any additional varint bytes
  while (pos < proof.length && proof[pos] & 0x80) {
    pos += 1;
  }
  pos += 1;

  // Remaining data before the final flag bytes should be merkle nodes
  const merkleData = proof.slice(pos, -2);

  // Validate each 32-byte node
  const nodes = [];
  for (let i = 0; i < merkleData.length; i += 32) {
    if (i + 32 <= merkleData.length) {
      nodes.push(merkleData.slice(i, i + 32));
    }
  }

  // console.log(`Found ${nodes.length} merkle nodes`);

  // Join all nodes into a single buffer
  //@ts-ignore
  return Buffer.concat(nodes);
}

export function parseProof(
  rawProof: Buffer,
  txid: string,
  txIndex: number,
  txIds: string[]
): Buffer {
  // Single transaction case
  if (txIds.length === 1) {
    return Buffer.alloc(0);
  }

  // Two transaction case
  if (txIds.length === 2) {
    const siblingTxid = txIndex === 1 ? txIds[0] : txIds[1];
    return Buffer.from(siblingTxid, "hex").reverse();
  }

  // Three transactions case
  if (txIds.length === 3) {
    if (txIndex === 0 || txIndex === 1) {
      // For transactions 0 and 1, the sibling is the other in the first pair.
      const siblingIndex = txIndex === 0 ? 1 : 0;
      const sibling = Buffer.from(txIds[siblingIndex], "hex").reverse();

      // The third transaction is duplicated to form its pair.
      const tx = Buffer.from(txIds[2], "hex").reverse();
      const combinedTx = Buffer.concat([tx, tx]); // duplicate the tx
      const firstHash = crypto.createHash("sha256").update(combinedTx).digest();
      const finalHash = crypto.createHash("sha256").update(firstHash).digest();

      return Buffer.concat([sibling, finalHash]);
    } else if (txIndex === 2) {
      // For the third transaction, it’s paired with itself (duplicate).
      const sibling = Buffer.from(txIds[2], "hex").reverse();

      // Use the first pair (txIds[0] and txIds[1]) to compute the hash.
      const tx1 = Buffer.from(txIds[0], "hex").reverse();
      const tx2 = Buffer.from(txIds[1], "hex").reverse();
      const combinedTx = Buffer.concat([tx1, tx2]);
      const firstHash = crypto.createHash("sha256").update(combinedTx).digest();
      const finalHash = crypto.createHash("sha256").update(firstHash).digest();

      return Buffer.concat([sibling, finalHash]);
    }
  }

  // More complex case for 4 or more transactions
  if (txIds.length >= 4) {
    // Determine the sibling index for the current transaction.
    const siblingIndex = txIndex % 2 === 1 ? txIndex - 1 : txIndex + 1;

    if (siblingIndex < txIds.length) {
      let proof = Buffer.from(txIds[siblingIndex], "hex").reverse();

      // Depending on the txIndex, pick the other pair to hash.
      const pairStart = txIndex >= 2 ? 0 : 2;

      const tx1 = Buffer.from(txIds[pairStart], "hex").reverse();
      const tx2 = Buffer.from(txIds[pairStart + 1], "hex").reverse();

      const combinedTx = Buffer.concat([tx1, tx2]);
      const firstHash = crypto.createHash("sha256").update(combinedTx).digest();
      const finalHash = crypto.createHash("sha256").update(firstHash).digest();

      proof = Buffer.concat([proof, finalHash]);
      return proof;
    }
  }

  // Return an empty buffer if no valid proof could be constructed.
  return Buffer.alloc(0);
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

export function convertTimestampToLocalTime(timestamp: number) {
  // Convert the timestamp to milliseconds by multiplying by 1000
  const date = new Date(timestamp * 1000);

  // Get the user's current time zone
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Format the date to the user's local time zone
  const options: Intl.DateTimeFormatOptions = {
    timeZone,
    hour12: true,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  };
  const localDate = new Intl.DateTimeFormat("en-US", options).format(date);

  return localDate;
}

export function formatTimestampToLocal(ts: string): string {
  if (!ts) return "";
  const date = new Date(ts);
  // Example: May 09 2025 11:38:03 AM (+05:30 UTC)
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}
