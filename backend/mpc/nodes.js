
import { decodeHex, encodeHex } from "./config/hex.js";
const ENC_KEY_TAG = 74;
const SCHNORR_MSG = 75;

import { SignAlgo } from "./config/index.js";

const start = async (
  endpoint,
  instance,
  msg,
) => {
  let resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msg),
  });

  if (resp.status != 200) {
    console.log("resp status", endpoint, resp.status, await resp.text());
    throw new Error("status " + resp.status);
  }

  return await resp.json();
};

export async function startDkg(
  signAlgo,
  endpoint,
  instance,
  msg,
) {
  const url = signAlgo === SignAlgo.Taproot
    ? "/v1/taproot/keygen"
    : "/v1/ecdsa/keygen";
  const resp = await start(endpoint + url, instance, msg);

  return resp;
}

export async function startDsg(
  signAlgo,
  endpoint,
  instance,
  msg,
) {
  const url = signAlgo === SignAlgo.Taproot
    ? "/v1/taproot/signgen"
    : "/v1/ecdsa/signgen";

  const resp = await start(endpoint + url, instance, msg);
  return resp;
}

export async function startPreSign(
  endpoint,
  instance,
  msg,
) {
  let resp = await start(endpoint + "/v1/pre-sign", instance, msg);

  return resp;
}

export async function startFinSign(
  endpoint,
  instance,
  msg,
) {
  let resp = await start(endpoint + "/v1/pre-fin", instance, msg);

  return resp;
}

export async function createKeygenSetup(
  signAlgo,
  cluster,
  participants,
  threshold,
  ttl = 10,
) {
  const instance = encodeHex(crypto.getRandomValues(new Uint8Array(32)));


  const keyParams = {
    instance: instance,
    ttl,
    threshold,
    party_vks: cluster.nodes.slice(0, participants).map(node => node.publicKey)
  }


  const bytes = Uint8Array.from(Buffer.from(JSON.stringify(keyParams)));

  const signature = await ed.signAsync(bytes, cluster.setup.secretKey);


  const request = JSON.stringify({
    params: encodeHex(bytes),
    signature: encodeHex(signature)
  })


  const setup = {
    instance,
    msg: encodeHex(Buffer.from(request)),
  };


  return { instance, setup };

};

export const messageHash = (
  signHashFn,
  signMessage,
) => {
  let message = signMessage;
  if (signMessage.startsWith("0x")) {
    message = decodeHex(signMessage.substring(2));
  } else {
    throw new Error("message should contain prefix 0x");
  }

  switch (signHashFn) {
    case "SHA256":
      return { sha256: message };

    case "SHA256D":
      return { sha256D: message };

    case "HASH":
      return { hash: message };

    case "KECCAK256":
      return { keccak256: message };

    default:
      throw new Error("invalid hash Fn");
  }
};

export async function createSignSetup(
  signAlgo,
  cluster,
  threshold,
  keyId,
  message,
  hashFn,
  ttl = 10,
  tags,
) {
  const instance = encodeHex(crypto.getRandomValues(new Uint8Array(32)));

  let signParams = {
    instance,
    key_id: keyId,
    ttl,
    message: message.slice(2),
    party_vks: cluster.nodes.slice(0, threshold).map(node => node.publicKey),
    hash_fn: "RawMessage"
  }

  if (signAlgo === SignAlgo.Ecdsa) {
    signParams = {
      ...signParams,
      hash_fn: hashFn //Sha256D for BTC & Keccak256 for EVM
    }
  }

  const bytes = Uint8Array.from(Buffer.from(JSON.stringify(signParams)));

  const signature = await ed.signAsync(bytes, cluster.setup.secretKey);

  const request = JSON.stringify({
    params: encodeHex(bytes),
    signature: encodeHex(signature)
  })

  const setup = {
    instance,
    msg: encodeHex(Buffer.from(request)),
  };

  return { instance, setup };
}

export function createFinishSetup(
  cluster,
  threshold,
  preSignId,
  message,
  ttl = 10,
  tags,
) {
  let instance = genInstanceId();
  let builder = new FinishSetupBuilder(preSignId);

  cluster.nodes
    .slice(0, threshold)
    .forEach((n) => builder.addParty(n.publicKey));


  if (message.sha256) {
    builder.withHashSha256(message.sha256);
  } else if (message.sha256D) {
    builder.withHashSha256d(message.sha256D);
  } else if (message.hash) {
    builder.withHash(message.hash);
  } else if (message.keccak256) {
    builder.withHashKeccak256(message.keccak256);
  } else {
    throw new Error("missing message");
  }

  tags?.forEach(({ tag, value }) => builder.addTag(tag, value));

  let setup = builder.build(instance, ttl, cluster.setup.secretKey);

  return { setup, instance };
}

export function randomSeed(count = 32) {
  return window.crypto.getRandomValues(new Uint8Array(count));
}
