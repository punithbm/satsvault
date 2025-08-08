"use client";
import ecc from "@bitcoinerlab/secp256k1";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useBtcWallet } from "@/lib/context/WalletContext";
import { ECPairFactory } from "ecpair";
import { initEccLib, crypto, networks, payments, Psbt } from "bitcoinjs-lib";
import { toXOnly } from "bitcoinjs-lib/src/psbt/bip371";
import { fetchBalance, getUtxos, pushTx } from "@/hooks/swr";
import { createStakeTimelockScript, selectUtxos } from "@/lib/utils/index";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { covertSatsToBtc, truncateAddress } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { CopyIcon } from "../shared/CopyIcon";
import VerifyTxInclusion from "./VerifyTxInclusion";

import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

export const StakeCard: React.FC = () => {
  const ECPair = ECPairFactory(ecc);
  initEccLib(ecc);
  const router = useRouter();
  const { isConnected, walletAddress, getPublicKey } = useBtcWallet();
  const { account } = useWallet();
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [txHash, setTxHash] = useState("");
  const [verifyInclusion, setVerifyInclusion] = useState(false);

  // Form state
  const [formValues, setFormValues] = useState({
    stakeAmount: "",
    receipientAddress: account?.address ?? "",
    backupBtcAddress: "",
  });
  const [formErrors, setFormErrors] = useState({
    stakeAmount: "",
    receipientAddress: "",
    backupBtcAddress: "",
  });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  async function callCreateWallet(
    pubkey: string,
    message: string,
    signature: string
  ) {
    const baseUrl = process.env.NEXT_PUBLIC_DVAULT_BASE_URL;
    const url = `${baseUrl}/create-wallet`;
    const data = {
      pubkey: pubkey,
      message: message,
      signature: signature,
      btcAddress: walletAddress,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.text();
      const resultData = JSON.parse(result);
      if (resultData.status) {
        toast.success("Registration completed successfully");
        setLoading(false);
        router.push("/deposit");
      } else {
        toast.error("Failed to register");
      }
      console.log("Response:", result);
    } catch (error) {
      console.error("Error calling API:", error);
    }
  }

  // Example usage

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const msg = "Signing this message to confirm wallet access.";
      if (!window.unisat) {
        toast.error("UniSat wallet not installed");
        return;
      }
      let signature = await window.unisat.signMessage(msg);
      let pubkey = await window?.unisat?.getPublicKey();
      if (!pubkey) {
        toast.error("Failed to get public key");
        return;
      }
      callCreateWallet(pubkey, msg, signature);
    } catch (error) {
      console.error("Transaction failed", error);
    } finally {
      setLoading(false);
    }
  };

  // Update recipient address when account changes
  useEffect(() => {
    if (account?.address) {
      setFormValues((prev) => ({
        ...prev,
        receipientAddress: account.address,
      }));
    }
  }, [account?.address]);

  useEffect(() => {
    const fetchPublicKey = async () => {
      if (isConnected) {
        const key = await getPublicKey();
        setPublicKey(key);
      }
    };

    const fetchWalletBalance = async () => {
      if (isConnected) {
        const balance = await fetchBalance(walletAddress);
        setBalance(balance);
      }
    };

    fetchPublicKey();
    fetchWalletBalance();
  }, [isConnected, getPublicKey, walletAddress]);

  console.log(balance, "balance");

  const recipientPrivKey = process.env.NEXT_PUBLIC_RECIPIENT_PRIVATE_KEY ?? "";

  if (!recipientPrivKey) {
    throw new Error("Recipient private key not found in environment variables");
  }

  const recipientKeyPair = ECPair.fromWIF(recipientPrivKey, networks.testnet);

  const tweakedRecipientKeyPair = recipientKeyPair.tweak(
    crypto.taggedHash("TapTweak", toXOnly(recipientKeyPair.publicKey))
  );

  const handleSendTransaction = async (stakeAmount: any) => {
    console.log(stakeAmount, "stakeAmount");
    const stakeAmountSats = Number(stakeAmount * 1e8).toFixed(0);
    console.log(stakeAmountSats, "stakeAmountSats");
    if (!publicKey) {
      toast.error("Public key not available");
      return;
    }

    try {
      setLoading(true);

      // Create script with absolute timelock
      const outputScript = createStakeTimelockScript(
        toXOnly(tweakedRecipientKeyPair.publicKey)
      );

      // const dummyScript = createDummyScript(
      //   toXOnly(tweakedRecipientKeyPair.publicKey)
      // );

      const scriptTree = {
        output: outputScript,
        redeemVersion: 192,
      };

      // Create P2TR address with timelock script
      const scriptTaproot = payments.p2tr({
        internalPubkey: toXOnly(tweakedRecipientKeyPair.publicKey),
        scriptTree,
        // redeem: scriptTree,
        network: networks.testnet,
      });
      const script_addr = scriptTaproot.address ?? "";
      console.log(script_addr, "script_addr");

      // Build transaction
      const psbt = new Psbt({ network: networks.testnet });
      const utxos = await getUtxos({ address: walletAddress });
      const txAmount = stakeAmountSats; // 0.0001 BTC
      const { selectedUtxos, totalValue } = selectUtxos(utxos, txAmount);

      const publicKeyBuffer = Buffer.from(publicKey, "hex");

      const tweakedKeyPair = ECPair.fromPublicKey(publicKeyBuffer).tweak(
        crypto.taggedHash("TapTweak", toXOnly(publicKeyBuffer))
      );

      const p2pktr = payments.p2tr({
        pubkey: toXOnly(tweakedKeyPair.publicKey),
        network: networks.testnet,
      });
      const p2pktr_addr = p2pktr.address ?? "";

      console.log(p2pktr_addr, "p2pktr_addr");

      selectedUtxos.forEach((utxo: any) => {
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          //how to get p2pktr.output
          witnessUtxo: { value: utxo.value, script: p2pktr.output! },
          tapInternalKey: toXOnly(tweakedRecipientKeyPair.publicKey),
        });
      });

      const fee = 200;
      const changeAmount = totalValue - Number(txAmount) - fee;

      psbt.addOutput({
        address: script_addr,
        value: Number(txAmount),
      });

      if (changeAmount >= 546) {
        psbt.addOutput({
          address: p2pktr_addr,
          value: changeAmount,
        });
      }

      // psbt.signInput(0, tweakedKeyPair);
      // psbt.finalizeAllInputs();

      // const tx = psbt.extractTransaction();
      // const txid = await pushTx(tx.toHex());

      // Sign with UniSat
      const psbtHex = psbt.toHex();

      // Check if UniSat wallet is available
      if (typeof window.unisat === "undefined") {
        toast.error(
          "UniSat wallet not detected. Please install the UniSat wallet extension."
        );
        // setStatus("error");
        setLoading(false);
        return;
      }

      const signedPsbtHex = await window.unisat.signPsbt(psbtHex);

      // Extract the final transaction
      const psbtSigned = Psbt.fromHex(signedPsbtHex);
      const finalTx = psbtSigned.extractTransaction().toHex();

      // Broadcast transaction
      const txid = await pushTx(finalTx);
      console.log("Transaction ID:", txid);
      setTxHash(txid);
      setLoading(false);
      // setStatus("done");
    } catch (error) {
      console.error("Transaction error:", error);
      toast.error("Transaction failed");
      // setStatus("error");
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 w-full">
      {/* <h2 className="text-2xl font-bold mb-4 text-center">Sign Message</h2> */}

      {!isConnected && (
        <div className="text-center text-red-500 mb-4">
          Please connect your wallet
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="p-4 rounded-sm bg-slate-100 mb-2">
          Signing this message to confirm wallet access.
        </div>
        <button
          type="submit"
          disabled={!isConnected || loading}
          className="w-full bg-blue-500 text-white py-2 rounded-md 
            hover:bg-blue-600 transition-colors duration-300 
            disabled:opacity-50"
        >
          {loading ? "Signing..." : "Sign Message"}
        </button>
      </form>
      {txHash && (
        <div className="mt-4">
          <p className="text-green-500">Transaction successful</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <p>Transaction ID: {truncateAddress(txHash)}</p>
              <CopyIcon text={txHash} />
            </div>
            <Link
              href={`https://signet.surge.dev/tx/${txHash}`}
              target="_blank"
              className="flex items-center space-x-2"
            >
              <p>View Transaction</p>
              <ExternalLink size={16} />
            </Link>
          </div>
        </div>
      )}

      {txHash && (
        <button
          type="button"
          disabled={!txHash}
          onClick={() => router.push("/btc-staking")}
          className="w-full border border-blue-500 text-blue-500 py-2 rounded-md mt-4 
            hover:bg-blue-100 hover:text-blue-600 transition-colors duration-300 
            disabled:opacity-50"
        >
          {"Register Stake"}
        </button>
      )}
    </div>
  );
};

export default StakeCard;
