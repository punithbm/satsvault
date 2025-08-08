"use client";
import ecc from "@bitcoinerlab/secp256k1";
import { useRouter } from "next/navigation";
import { fetchBalance, getUtxos, pushTx } from "@/hooks/swr";
import { useBtcWallet } from "@/lib/context/WalletContext";
import { btcToSatoshi, covertSatsToBtc, getWalletBalance } from "@/lib/utils";
import { createPsbt, selectUtxos } from "@/lib/utils/index";
import { Psbt, initEccLib } from "bitcoinjs-lib";
import io from "socket.io-client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { signMessageWithPorto, signPsbtWithPorto } from "@/lib/porto-utils";
import { z } from "zod";
import BackButton from "@/components/shared/BackButton";
import { Button } from "@/components/ui/button";
import { CurrencyBtc, Globe, HourglassHigh } from "@phosphor-icons/react";

const socket = io(process.env.NEXT_PUBLIC_DVAULT_WS_URL);

socket.on("depositCompleted", async (data) => {});

export default function Deposit() {
  initEccLib(ecc);
  const {
    isConnected,
    btcAddress: senderAddress,
    walletAddress,
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
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);

  // useEffect(() => {
  //     async function getWalletAddress() {
  //         //@ts-ignore
  //         const data = await Wallet.request("getAccounts", {
  //             purposes: [AddressPurpose.Payment],
  //             message: "Please connect to SatsVault"
  //         });
  const depositSchema = z.object({
    amount: z
      .string()
      .min(1, "Amount is required")
      .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: "Amount must be a positive number",
      })
      .refine((val) => Number(val) <= balance, {
        message: `Amount cannot exceed your available balance (${balance} BTC)`,
      }),
  });

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
      if (isConnected) {
        await updateBalance();
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
      }
    }
    fetchData();
  }, [senderAddress]);

  const updateBalance = async () => {
    if (!senderAddress) return;
    setBalanceLoading(true);
    const balance = await fetchBalance(senderAddress);
    setBalance(covertSatsToBtc(balance));
    // setBalance(0);
    setBalanceLoading(false);
  };

  const handleDeposit = async () => {
    const validation = depositSchema.safeParse({ amount: btcVal });
    if (!validation.success) {
      // Show all errors using toast
      validation.error.errors.forEach((err) => toast.error(err.message));
      return;
    }

    setLoading(true);

    try {
      if (!senderAddress) {
        toast.error("Wallet not connected");
        setLoading(false);
        return;
      }

      // First get signature from Porto wallet
      const message = `Deposit ${btcVal} BTC to SatsVault wallet`;
      let signResult;

      try {
        signResult = await signMessageWithPorto(message);
      } catch (error) {
        console.error("Message signing failed:", error);
        setLoading(false);
        return;
      }

      // Call deposit-funds API with signature
      const depositResponse = await fetch(
        "http://localhost:3000/api/deposit-funds",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bitcoinAddress: walletAddress,
            message: message,
            signature: signResult.signature,
          }),
        }
      );

      if (depositResponse.ok) {
        console.log("Deposit funds API called successfully");
        toast.success("Deposit initiated successfully");
        setBtcVal("");

        // Update wallet balance after successful deposit
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
        updateBalance();
      } else {
        console.error(
          "Failed to call deposit funds API:",
          depositResponse.status
        );
        toast.error("Failed to initiate deposit");
      }
    } catch (error) {
      console.error("Error calling deposit funds API:", error);
      toast.error("Failed to initiate deposit");
    } finally {
      setLoading(false);
    }
  };

  async function addFunds(
    walletAddress: string,
    message: string,
    signature: string
  ) {
    setTxid("");
    setAddFundsTxid("");
    const publicKey = await getPublicKey();
    const baseUrl = process.env.NEXT_PUBLIC_DVAULT_BASE_URL;
    const url = `${baseUrl}/add-funds`;
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
      const result = await response.text();
      const resultData = JSON.parse(result);
      console.log("resultData", resultData);
      if (resultData.status) {
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
        updateBalance();
        setAddFundsTxid(resultData.data);
        setFaucetLoading(false);
        toast.success(
          "Funds added successfully. Balance will reflect after block confirmation"
        );
      } else {
        setFaucetLoading(false);
        toast.error("Failed to add funds");
      }
    } catch (error) {
      setFaucetLoading(false);
      console.error("Error calling API:", error);
      toast.error("Failed to add funds");
    }
  }

  const handleAddFunds = async () => {
    setFaucetLoading(true);
    try {
      const msg = "Add 0.1 BTC from faucet to this wallet";

      try {
        const signResult = await signMessageWithPorto(msg);
        addFunds(senderAddress as string, msg, signResult.signature);
      } catch (error) {
        console.error("Message signing failed:", error);
        setFaucetLoading(false);
        return;
      }
    } catch (error) {
      console.error("Transaction failed", error);
      setFaucetLoading(false);
    }
  };

  return (
    <div className="gap-4 h-full flex flex-col w-full lg:pt-[136px] pt-[100px] items-start justify-between">
      <div className="w-full">
        <BackButton />
        <p className="lg:text-5xl text-3xl font-medium tracking-tight leading-[100%] text-grey-700 mt-7 mb-5 font-sans">
          Load Wallet
        </p>
        <div>
          <label
            htmlFor="amount"
            className="pl-4 text-grey-400 text-sm-medium pb-0.5"
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
            disabled={balanceLoading || !(balance > 0)}
            placeholder="Enter Deposit Amount"
            className="mb-3 font-sans"
          />
          <p className="text-sm pl-4 text-grey-400 flex items-center gap-x-1">
            <span>
              <CurrencyBtc size={20} weight="duotone" color="#5F5F5F" />
            </span>
            BTC Available in Connected Wallet: {balance.toFixed(4)} BTC
          </p>
        </div>
      </div>
      <div className="pb-20 w-full">
        <div className="w-full text-center">
          <div className="flex items-center justify-center gap-2 w-full">
            <Button
              variant={"primary"}
              onClick={() => handleDeposit()}
              disabled={loading || balance <= 0 || Number(btcVal) <= 0}
              className="w-full lg:text-[20px] text-[16px] leading-[140%] tracking-wide rounded-full text-white font-bold font-sans"
            >
              {loading ? "Depositing..." : "Deposit to SatsVault"}
            </Button>
          </div>

          {!balanceLoading && balance <= 0 && (
            <div className="text-center pt-3">
              <button
                className={`text-sm tracking-tight ${
                  loading
                    ? "text-black"
                    : "text-orangeSecondary underline underline-offset-2"
                }`}
                onClick={() => handleAddFunds()}
                disabled={loading}
              >
                {loading
                  ? "Depositing 0.1BTC from Faucet..."
                  : "No BTC in wallet? Request 0.1 BTC from faucet"}
              </button>
            </div>
          )}
          {!balanceLoading && balance > 0 && (
            <div className="text-center pt-3">
              <button
                className={`text-sm tracking-tight ${
                  faucetLoading
                    ? "text-black"
                    : "text-orangeSecondary underline underline-offset-2"
                }`}
                onClick={() => handleAddFunds()}
                disabled={faucetLoading}
              >
                {faucetLoading
                  ? "Depositing 0.1BTC from Faucet..."
                  : "Running low on BTC? Get 0.1 BTC from the faucet!"}
              </button>
            </div>
          )}
          <div className="my-3 flex items-center gap-x-1 w-full justify-center">
            <HourglassHigh color="#272727" size={20} />
            <p className="text-sm text-grey-600 font-regular tracking-tight leading-[100%]">
              Takes ~10min to Deposit
            </p>
          </div>
        </div>

        {addFundsTxid && (
          <a
            href={`https://v2.signet.surge.dev/tx/${addFundsTxid}`}
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
        {txid && (
          <a
            href={`https://v2.signet.surge.dev/tx/${txid}`}
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

      {/* <div className="flex flex-col items-center space-y-4">
        
          <Input
            type="text"
            value={btcVal}
            onChange={(e) => {
              if (numberRegex.test(e.target.value)) {
                setBtcVal(e.target.value);
              }
            }}
            placeholder="Enter Withdrawal Amount"
          />
          <p className="text-white text-md">
            SatsVault Wallet Bal: {walletBalance} BTC
          </p>
          <p className="text-white text-md">
            Connected BTC Wallet Bal: {balance.toFixed(4)} BTC
          </p>
          <button
            className="px-6 py-3 bg-red-500 text-black font-bold hover:bg-red-400 transition rounded-full"
            onClick={handleWithdraw}
            disabled={loading}
          >
            {loading ? "Processing..." : "Withdraw"}
          </button>
          {withdrawTxid && (
            <p className="text-green-500 text-md">
              Withdrawal successful!{" "}
              <a
                href={`https://v2.signet.surge.dev/tx/${withdrawTxid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline relative left-2"
              >
                View Transaction
              </a>
            </p>
          )}
        </div> */}
    </div>
  );
}
