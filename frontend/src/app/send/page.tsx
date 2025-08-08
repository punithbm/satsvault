"use client";
import ecc from "@bitcoinerlab/secp256k1";
import { fetchBalance, getUtxos, pushTx } from "@/hooks/swr";
import { useBtcWallet } from "@/lib/context/WalletContext";
import { btcToSatoshi, covertSatsToBtc, getWalletBalance } from "@/lib/utils";
import { icons } from "@/lib/utils/images";
import { createPsbt, selectUtxos } from "@/lib/utils/index";
import * as bitcoin from "bitcoinjs-lib";
import { Psbt, networks, initEccLib } from "bitcoinjs-lib";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import io from "socket.io-client";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { signMessageWithPorto } from "@/lib/porto-utils";
import BackButton from "@/components/shared/BackButton";
import { Button } from "@/components/ui/button";
import BalanceCard from "@/components/home/BalanceCard";
import { z } from "zod";

const socket = io(process.env.NEXT_PUBLIC_DVAULT_WS_URL);

socket.on("depositCompleted", async (data) => {});

const numberRegex = /^\d*\.?\d*$/;

export default function Deposit() {
  initEccLib(ecc);
  const router = useRouter();
  const {
    isConnected,
    getPublicKey,
    btcAddress: senderAddress,
  } = useBtcWallet();
  const [walletBalance, setWalletBalance] = useState(0);
  const [btcVal, setBtcVal] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const sendSchema = z.object({
    amount: z
      .string()
      .min(1, "Amount is required")
      .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: "Amount must be a positive number",
      })
      .refine((val) => Number(val) <= walletBalance, {
        message: `Amount cannot exceed your available balance (${walletBalance} BTC)`,
      }),
    btcAddress: z
      .string()
      .min(1, "BTC Address is required")
      .regex(
        /^tb1[qp][a-z0-9]{38,60}$/,
        "Invalid testnet BTC address (must start with tb1p or tb1q)"
      ),
  });

  useEffect(() => {
    if (!senderAddress) return;
    fetchWalletBalance(senderAddress as string);
  }, [senderAddress]);

  async function fetchWalletBalance(btcAddress: string) {
    try {
      const data = await getWalletBalance(btcAddress);
      if (data && data.data) {
        setWalletBalance(data.data.status ? data.data.data : 0);
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    }
  }

  async function amountTransfer(
    btcAddress: string,
    message: string,
    signature: string
  ) {
    const publicKey = await getPublicKey();
    const baseUrl = process.env.NEXT_PUBLIC_DVAULT_BASE_URL;
    const url = `${baseUrl}/transfer`;
    const data = {
      pubkey: publicKey,
      message: message,
      signature: signature,
      btcAddress: btcAddress,
      amount: btcVal,
      toAddress: recipientAddress,
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
        toast.success("Transaction completed successfully");
        getWalletBalance(senderAddress as string);
        setLoading(false);
        setRecipientAddress("");
        setBtcVal("");
      } else {
        toast.error("Failed to register");
        setRecipientAddress("");
        setBtcVal("");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error calling API:", error);
      //remove this
      toast.error("Failed to create wallet");
      setLoading(false);
      setRecipientAddress("");
      setBtcVal("");
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    const sendResult = sendSchema.safeParse({
      amount: btcVal,
      btcAddress: recipientAddress,
    });
    if (!sendResult.success) {
      toast.error(sendResult.error.errors[0].message);
      return;
    }
    if (!recipientAddress || !btcVal) {
      toast.error("Please enter recipient address and amount");
      return;
    }

    if (!senderAddress) {
      toast.error("Please connect to wallet");
      return;
    }

    try {
      const msg = `Signing this message to confirm a transfer of ${btcVal} BTC to ${recipientAddress} account. `;

      setLoading(true);

      try {
        const signResult = await signMessageWithPorto(msg);
        amountTransfer(senderAddress as string, msg, signResult.signature);
      } catch (error) {
        console.error("Message signing failed:", error);
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error("Transaction failed", error);
    }
  };

  return (
    <div className="h-full text-black font-mono relative w-full lg:pt-[136px] pt-[100px] text-start flex flex-col justify-between ">
      <div className="w-full h-full">
        <BackButton />
        <div className="flex flex-col items-start  space-y-6 h-full w-full ">
          <p className="lg:text-5xl text-3xl font-medium tracking-tight leading-[100%] text-grey-700 mt-7 mb-5 font-sans">
            Send BTC
          </p>

          <div className="flex flex-col items-start space-y-5 w-full  text-start">
            <div className="flex flex-col space-y-2 w-full ">
              <label
                htmlFor="btcVal"
                className="pl-4 text-grey-400 text-sm-semibold pb-0.5"
              >
                AMOUNT
              </label>
              <Input
                type="text"
                name="btcVal"
                value={btcVal}
                onChange={(e) => {
                  if (numberRegex.test(e.target.value)) {
                    setBtcVal(e.target.value);
                  }
                }}
                placeholder="Enter BTC Value"
                className="relative  w-full"
              />
            </div>
            <div className="flex flex-col space-y-2 w-full">
              <label
                htmlFor="recipientAddress"
                className="pl-4 text-grey-400 text-sm-semibold pb-0.5"
              >
                RECEIVER ADDRESS
              </label>
              <Input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Enter BTC Address"
                className="relative  w-full"
              />
            </div>
            <div className="w-full flex justify-center">
              <Button
                onClick={handleSubmit}
                disabled={loading || btcVal === "" || recipientAddress === ""}
                className="w-full lg:text-[20px] text-[16px] leading-[140%] tracking-wide rounded-full text-white font-bold mb-5"
              >
                {loading ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="pb-20">
        <BalanceCard
          btcAddress={senderAddress as string}
          balance={walletBalance}
        />
      </div>
    </div>
  );
}
