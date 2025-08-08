"use client";
import ecc from "@bitcoinerlab/secp256k1";
import { useRouter } from "next/navigation";
import { fetchBalance, getUtxos, pushTx } from "@/hooks/swr";
import { useBtcWallet } from "@/lib/context/WalletContext";
import { btcToSatoshi, covertSatsToBtc, getWalletBalance } from "@/lib/utils";
import { icons } from "@/lib/utils/images";
import { createPsbt, selectUtxos } from "@/lib/utils/index";
import * as bitcoin from "bitcoinjs-lib";
import { Psbt, networks, initEccLib } from "bitcoinjs-lib";
import io from "socket.io-client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, InfoIcon } from "lucide-react";
import { signMessageWithPorto } from "@/lib/porto-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { z } from "zod";
import BackButton from "@/components/shared/BackButton";
import { Button } from "@/components/ui/button";
import { CurrencyBtc, Globe, HourglassHigh } from "@phosphor-icons/react";
import { useWalletBalance } from "@/hooks/useWalletBalance";

const socket = io(process.env.NEXT_PUBLIC_DVAULT_WS_URL);

socket.on("depositCompleted", async (data) => {});

export default function Deposit() {
  initEccLib(ecc);
  const {
    isConnected,
    btcAddress: senderAddress,
    addressType,
    getPublicKey,
  } = useBtcWallet();
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [isDeposit, setIsDeposit] = useState(true);
  const [txid, setTxid] = useState("");
  const [withdrawTxid, setWithdrawTxid] = useState("");
  const [addFundsTxid, setAddFundsTxid] = useState("");
  const [btcVal, setBtcVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const { balance: walletBalance, setSatsBalance: setWalletBalance } =
    useWalletBalance(senderAddress ?? "");

  // useEffect(() => {
  //     async function getWalletAddress() {
  //         //@ts-ignore
  //         const data = await Wallet.request("getAccounts", {
  //             purposes: [AddressPurpose.Payment],
  //             message: "Please connect to SatsVault"
  //         });

  const withdrawSchema = z.object({
    amount: z
      .string()
      .min(1, "Amount is required")
      .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: "Amount must be a positive number",
      })
      .refine((val) => Number(val) <= walletBalance, {
        message: `Amount cannot exceed your available balance (${walletBalance} BTC)`,
      }),
  });
  const numberRegex = /^\d*\.?\d*$/;

  // useEffect(() => {
  //     async function getWalletAddress() {
  //         //@ts-ignore
  //         const data = await Wallet.request("getAccounts", {
  //             purposes: [AddressPurpose.Payment],
  //             message: "Please connect to SatsVault"
  //         });

  //         if (data.status === "success") {
  //             setSenderAddress(data?.result?.[0]?.address);
  //             setPublicKey(data?.result?.[0]?.publicKey);
  //             setAddressType(data?.result?.[0]?.addressType);
  //         }
  //     }
  //     getWalletAddress();
  // }, []);

  useEffect(() => {
    async function fetchData() {
      setBalanceLoading(true);
      if (isConnected) {
        await updateBalance();
        const walletBalanceData = await getWalletBalance(
          senderAddress as string
        );
        if (walletBalanceData && walletBalanceData.data) {
          if (walletBalanceData.data.status) {
            setWalletBalance(walletBalanceData.data.data);
            // setWalletBalance(0);
          } else {
            setWalletBalance(0);
          }
        }
        setBalanceLoading(false);
      }
    }
    fetchData();
  }, [senderAddress]);

  const updateBalance = async () => {
    if (!senderAddress) return;
    const balance = await fetchBalance(senderAddress);
    setBalance(covertSatsToBtc(balance));
    // setBalance(0);
  };

  const handleWithdraw = async () => {
    setWithdrawTxid("");
    const validation = withdrawSchema.safeParse({ amount: btcVal });
    if (!validation.success) {
      // Show all errors using toast
      validation.error.errors.forEach((err) => toast.error(err.message));
      return;
    }
    setLoading(true);
    try {
      const msg = "Withdraw " + btcVal + " BTC from this wallet";
      let signResult;
      try {
        signResult = await signMessageWithPorto(msg);
      } catch (error) {
        console.error("Message signing failed:", error);
        setLoading(false);
        return;
      }
      try {
        const baseUrl = process.env.NEXT_PUBLIC_DVAULT_BASE_URL;
        const response = await fetch(`${baseUrl}/withdraw`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            btcAddress: senderAddress,
            amount: btcVal,
            message: msg,
            signature: signResult.signature,
          }),
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }
        const withdrawData = await response.json();
        const walletBalanceData = await getWalletBalance(
          senderAddress as string
        );
        if (walletBalanceData && walletBalanceData.data) {
          if (walletBalanceData.data.status) {
            setWalletBalance(walletBalanceData.data.data);
          } else {
            setWalletBalance(0);
          }
        }
        setBtcVal("");
        setWithdrawTxid(withdrawData.data);
        toast.success(`Withdrawal successful! TXID: ${withdrawData.data}`);
        setLoading(false);
        return withdrawData;
      } catch (error) {
        console.error("Failed to call withdraw API:", error);
      }
    } catch (error) {
      console.error("Transaction failed", error);
      setLoading(false);
    }
  };

  return (
    <div className="gap-4 h-full flex flex-col w-full lg:pt-[136px] pt-[100px] items-start justify-between">
      <div className="w-full">
        <BackButton />
        <p className="lg:text-5xl text-3xl font-medium tracking-tight leading-[100%] text-grey-700 mt-7 mb-5 font-sans">
          Withdraw
        </p>
        <div>
          <label
            htmlFor="amount"
            className="pl-4 text-grey-400 text-sm-semibold pb-0.5 font"
          >
            Amount
          </label>
          <Input
            type="text"
            value={btcVal}
            onChange={(e) => {
              if (numberRegex.test(e.target.value)) {
                setBtcVal(e.target.value);
              }
            }}
            name="amount"
            disabled={balanceLoading || !(walletBalance > 0)}
            placeholder="Enter Withdrawal Amount"
            className="mb-3"
          />
          <p className="text-sm pl-4 text-grey-400 flex items-center gap-x-1">
            <span>
              <CurrencyBtc size={20} weight="duotone" color="#5F5F5F" />
            </span>
            BTC Available in SatsVault Wallet: {walletBalance} BTC
          </p>
        </div>
      </div>
      <div className="pb-20 w-full">
        <div className="w-full text-center">
          <div className="flex items-center justify-center gap-2 w-full">
            <Button
              variant={"primary"}
              onClick={handleWithdraw}
              disabled={loading || Number(btcVal) <= 0}
              className="w-full lg:text-[20px] text-[16px] leading-[140%] tracking-wide rounded-full text-white font-bold"
            >
              {loading ? "Withdrawing..." : "Withdraw to connected Wallet"}
            </Button>
          </div>
          {!balanceLoading && walletBalance <= 0 && (
            <div className="text-center pt-3">
              <button
                className={`text-sm tracking-tight ${"text-orangeSecondary underline underline-offset-2"}`}
                onClick={() => router.push("/deposit")}
                disabled={loading}
              >
                No BTC in SatsVault Wallet? Load Balance
              </button>
            </div>
          )}
        </div>
        <div className="my-3 flex items-center gap-x-1 w-full justify-center">
          <HourglassHigh color="#272727" size={20} />
          <p className="text-sm text-grey-600 font-regular tracking-tight leading-[100%]">
            Takes ~10min to Withdraw
          </p>
        </div>

        {withdrawTxid && (
          <a
            href={`https://v2.signet.surge.dev/tx/${withdrawTxid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orangeSecondary text-xs underline relative flex items-center text-center w-full justify-center mt-2"
          >
            <span className="">
              <Globe weight="duotone" color="#FF6431" size={20} />
            </span>
            View on Explorer
          </a>
        )}
      </div>
    </div>
  );
}
