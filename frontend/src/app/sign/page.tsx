"use client";
import { useBtcWallet } from "@/lib/context/WalletContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Wallet, { AddressPurpose, MessageSigningProtocols } from "sats-connect";
import { toast } from "sonner";
import format from "ecdsa-sig-formatter";
import { BIP322, Signer, Verifier } from "bip322-js";

export default function Onboarding() {
  const router = useRouter();
  const { connect, walletAddress, getPublicKey, addressType } = useBtcWallet();
  const [loading, setLoading] = useState(false);

  async function callCreateWallet(
    walletAddress: string,
    message: string,
    signature: string
  ) {
    const publicKey = await getPublicKey();
    const baseUrl = process.env.NEXT_PUBLIC_DVAULT_BASE_URL;
    const url = `${baseUrl}/create-wallet`;
    const data = {
      pubkey: publicKey,
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
      //change condition to check response
      const result = await response.text();
      const resultData = JSON.parse(result);
      if (resultData.status) {
        if (resultData.newRegistration) {
          toast.success("Registration completed successfully");
        } else {
          toast.success("Sign in successful");
        }
        router.push("/");
      } else {
        toast.error("Failed to register");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error calling API:", error);
      //remove this router.push
      router.push("/");
      toast.error("Failed to create wallet");
      setLoading(false);
    }
  }

  // Example usage

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const msg = "Signing this message to confirm wallet access.";

      const data = await Wallet.request("signMessage", {
        address: walletAddress as string,
        message: msg,
        protocol: MessageSigningProtocols.BIP322,
      });

      if (data.status !== "success") {
        toast.error("Failed to sign message");
        return;
      }

      callCreateWallet(walletAddress as string, msg, data?.result?.signature);
    } catch (error) {
      console.error("Transaction failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-white text-white font-mono relative overflow-hidden lg:container lg:mx-auto">
      <div className="relative z-10  items-center min-h-screen px-8 md:px-16 gap-12 flex w-full h-full justify-center text-center">
        {/* Left content */}
        <div className="h-[300px] flex flex-col justify-center items-center">
          {/* <div>
            <p className="text-cyan-400 tracking-widest uppercase text-md">
              Get Started
            </p>
            {isConnected ? (
              <div>
                <h1 className="text-red-500 text-5xl font-bold mt-2 mb-4">
                  Sign Msg
                </h1>
                <p className="text-lg mb-6 text-gray-200">
                  Sign the message to confirm wallet access.
                </p>
              </div>
            ) : (
              <div>
                <h1 className="text-red-500 text-5xl font-bold mt-2 mb-4">
                  Connect Wallet
                </h1>
                <p className="text-lg mb-6 text-gray-200">
                  Connect your BTC wallet
                </p>
              </div>
            )}
          </div> */}
          {/* Wallet Connect Message */}
          {/* <Image
            src={icons.satsVaultLogo.src}
            alt="SatsVault Logo"
            width={300}
            height={120}
            className="mb-8"
          /> */}
          {walletAddress ? (
            <div className="mb-8 text-center max-w-xl mx-auto flex flex-col items-center gap-y-4">
              <div className="text-lg font-bold text-green-300 mb-2 flex items-center gap-2">
                <span role="img" aria-label="party">
                  🎉
                </span>{" "}
                Wallet Connected!
              </div>
              <div className="text-grey-400 mb-4">
                You’re almost there. Just sign a quick message to verify it’s
                you and activate your SatsVault account.
              </div>
              <div className="text-grey-400 mb-6">
                SatsVault works with your existing Bitcoin wallet — no new
                accounts, no extra steps.
              </div>
            </div>
          ) : (
            <div className="mb-8 text-center max-w-xl mx-auto flex flex-col items-center gap-y-4">
              <div className="text-lg font-bold text-red-300 mb-2 flex items-center gap-2">
                <span role="img" aria-label="party">
                  🎉
                </span>{" "}
                Wallet Not Connected!
              </div>
              <div className="text-grey-400 mb-4">
                You’re almost there. Just connect your wallet to activate your
                SatsVault account.
              </div>
              <div className="text-grey-400 mb-6">
                SatsVault works with your existing Bitcoin wallet — no new
                accounts, no extra steps.
              </div>
            </div>
          )}
          {walletAddress ? (
            <button
              className="px-4 py-2 bg-orangeSecondary text-white font-bold rounded-full hover:bg-orangeSecondary/80 transition text-lg shadow"
              onClick={handleSubmit}
            >
              {loading ? "Signing..." : "Sign to Get Started"}
            </button>
          ) : (
            <button
              className="px-4 py-2 bg-orangeSecondary text-black font-bold hover:bg-orangeSecondary/80 transition rounded-full"
              onClick={() => connect()}
            >
              CONNECT WALLET
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
