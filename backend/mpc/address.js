import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import { initEccLib, networks, payments } from 'bitcoinjs-lib';
import { pubToAddress } from "@ethereumjs/util";
import * as secp256k1 from 'noble-secp256k1';


const ECPair = ECPairFactory(ecc);
initEccLib(ecc);

const toXOnly = (pubkey) => {
    return pubkey.subarray(1, 33);
};

export const generateTaprootAddress = (tweakedPublicKeyHex) => {
  const tweakedPubkey = Buffer.from(tweakedPublicKeyHex, 'hex');
  // Generate P2TR address
  const { address: taprootAddress } = payments.p2tr({
    internalPubkey: toXOnly(tweakedPubkey),
    network: networks.testnet,
  });

  return taprootAddress;
};

export const generateSegwitAddress = (publicKeyHex) => {
  const publicKeyBuffer = Buffer.from(publicKeyHex, 'hex');
  const { address: segwitAddress } = payments.p2wpkh({
    pubkey: publicKeyBuffer,
    network: networks.testnet, // Change to networks.bitcoin for mainnet
  });

  return segwitAddress;
};

export const generateEVMAddress = (publicKeyHex) => {
  if (!publicKeyHex) {
      return "";
  }
  const publicKeyBuffer = Buffer.from(publicKeyHex, "hex");
  const addressBuffer = Buffer.from(pubToAddress(publicKeyBuffer, true));
  let ethereumAddress = addressBuffer.toString("hex");
  if (!ethereumAddress.startsWith("0x")) {
      ethereumAddress = "0x" + ethereumAddress;
  }
  return ethereumAddress;
};

export async function verifySchnorrSignature(message, signature) {
  const publicKey = process.env.MPC_PUB_KEY;
  
  try {
    // Clean the hex strings
    const cleanMessage = message.replace('0x', '');
    const cleanSignature = signature.replace('0x', '');
    const cleanPublicKey = publicKey.replace('0x', '');

    // Log the values for debugging
    console.log({
      message: cleanMessage,
      signature: cleanSignature,
      publicKey: cleanPublicKey
    });

    // Convert hex strings to Uint8Array (using the cleaned hex strings)
    const messageArray = Uint8Array.from(Buffer.from(cleanMessage, 'hex'));
    const signatureArray = Uint8Array.from(Buffer.from(cleanSignature, 'hex'));
    const publicKeyArray = Uint8Array.from(Buffer.from(cleanPublicKey, 'hex'));

    // Log lengths for debugging
    console.log('Lengths:', {
      messageLength: messageArray.length,
      signatureLength: signatureArray.length,
      publicKeyLength: publicKeyArray.length
    });

    // Verify lengths
    // if (messageArray.length !== 32) throw new Error(`Invalid message length: ${messageArray.length}`);
    // if (signatureArray.length !== 64) throw new Error(`Invalid signature length: ${signatureArray.length}`);
    // if (publicKeyArray.length !== 32) throw new Error(`Invalid public key length: ${publicKeyArray.length}`);

    // Verify the Schnorr signature
    const isValid = await secp256k1.schnorr.verify(
      signatureArray,
      messageArray,
      publicKeyArray
    );

    console.log('Signature verification result:', isValid);
    return isValid;
  } catch (error) {
    console.error('Verification error:', error);
    return false;
  }
}