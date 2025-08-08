"use client";
import React, { useEffect, useState } from "react";
import "@/app/globals.css";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useBtcWallet } from "@/lib/context/WalletContext";
import { convertTimestampToLocalTime, satsToBtc } from "@/lib/utils/index";
import { truncateAddress } from "@/lib/utils";
import { CopyIcon } from "@/components/shared/CopyIcon";
import { ExternalLink, ExternalLinkIcon } from "lucide-react";
import {
  CaretLeft,
  ArrowUpRight,
  HandWithdraw,
  Plus,
  PlusCircle,
  ArrowSquareRight,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import BackButton from "@/components/shared/BackButton";

interface Transaction {
  type: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  timestamp: string;
  txHash: string;
}

const icons = {
  deposit: (
    <PlusCircle
      size="1em"
      className="lg:text-[28px] text-[20px] text-orangeSecondary"
      weight="duotone"
    />
  ),
  send: (
    <ArrowUpRight
      size="1em"
      className="lg:text-[28px] text-[20px] text-orangeSecondary"
      weight="duotone"
    />
  ),
  withdraw: (
    <HandWithdraw
      size="1em"
      className="lg:text-[28px] text-[20px] text-orangeSecondary"
      weight="duotone"
    />
  ),
  autopay: (
    <ArrowUpRight
      size="1em"
      className="lg:text-[28px] text-[20px] text-orangeSecondary"
      weight="duotone"
    />
  ),
};

const HistoryTable = () => {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { isConnected, btcAddress: senderAddress } = useBtcWallet();

  useEffect(() => {
    const fetchTransactionHistory = async (btcAddress: string) => {
      setLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_DVAULT_BASE_URL}/get-history?btcAddress=${btcAddress}`
        );
        const result = await response.json();
        if (response.ok) {
          console.log("History fetched successfully:", result.data);
          setTransactions(result.data);
        } else {
          console.error("Error fetching history:", result.message);
        }
      } catch (error) {
        console.error("Network error:", error);
      } finally {
        setLoading(false);
      }
    };
    if (!senderAddress) {
      return;
    }

    fetchTransactionHistory(senderAddress);
  }, [senderAddress]);

  return (
    <div className="w-full lg:max-w-[454px] mx-auto lg:pt-[136px] pt-[100px] pb-8">
      {/* Back Button */}
      <BackButton />
      {/* Heading */}
      <p className="lg:text-5xl text-3xl font-medium tracking-tight leading-[100%] text-black my-7 font-sans">
        History
      </p>
      {/* Transactions */}
      {loading ? (
        <TransactionHistoryShimmer />
      ) : !loading && transactions.length === 0 ? (
        <div className="flex flex-col gap-8">
          <p className="text-lg text-center font-medium tracking-tight leading-[100%] text-grey-400 my-7 font-sans max-w-[300px] mx-auto">
            Seems like you have not made any transactions yet
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {transactions.map((tx, idx) => (
            <div
              key={tx.txHash + idx}
              className="flex items-center justify-between border-grey-200"
            >
              {/* Left: Icon + Info */}
              <div className="flex items-center gap-5">
                <div className="bg-orangeSecondary/10 rounded-full lg:w-14 lg:h-14 w-10 h-10 flex items-center justify-center">
                  {icons[tx.type as keyof typeof icons]}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="text-grey-700 font-sans">
                      {tx.type === "deposit" && (
                        <div className="text-sm-semibold mb-0.5">
                          Loaded Wallet
                        </div>
                      )}
                      {tx.type === "withdraw" && (
                        <div className="text-sm-semibold mb-0.5">
                          BTC Withdrawn
                        </div>
                      )}
                      {(tx.type === "send" || tx.type === "autopay") && (
                        <div className="text-sm-semibold flex items-center gap-[2px]">
                          {tx.type === "send" ? "BTC Sent" : "BTC AutoPay"} to{" "}
                          <span className="!text-sm font-light leading-[100%] text-grey-700">
                            {truncateAddress(tx.toAddress ?? "")}
                          </span>
                          <CopyIcon
                            className=""
                            text={tx.toAddress || ""}
                            size={16}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-grey-400 text-sm leading-[100%] font-sans">
                    {convertTimestampToLocalTime(Number(tx.timestamp))}
                  </div>
                </div>
              </div>
              {/* Right: Amount + Hash */}
              <div className="flex flex-col items-end gap-2 min-w-[120px]">
                <span className="text-sm-semibold text-grey-600 font-sans">
                  {tx.type === "autopay" && tx.amount === "0" ? (
                    <span className="text-red-500">Failed</span>
                  ) : (
                    satsToBtc(tx.amount) + "BTC"
                  )}
                </span>
                {tx.txHash && ["deposit", "withdraw"].includes(tx.type) && (
                  <a
                    className="text-grey-400 text-sm flex items-center gap-1 hover:underline"
                    href={`https://v2.signet.surge.dev/tx/${tx.txHash.replace(
                      "0x",
                      ""
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {truncateAddress(tx.txHash.replace("0x", ""))}
                    <ArrowSquareOut
                      size={16}
                      weight="duotone"
                      color="#919191"
                    />
                  </a>
                )}
                {tx.txHash && tx.type === "send" && (
                  <button
                    onClick={() => router.push(`/tx/${tx.txHash}`)}
                    className="text-sm-normal text-grey-400 hover:underline"
                  >
                    {truncateAddress(tx.txHash)}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryTable;

function TransactionHistoryShimmer() {
  // Show 3 shimmer rows as placeholders
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      {[...Array(3)].map((_, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between border-grey-200"
        >
          {/* Left: Icon + Info */}
          <div className="flex items-center gap-5">
            <div className="bg-orangeSecondary/10 rounded-full w-14 h-14 flex items-center justify-center">
              <div className="bg-orangeSecondary/40 rounded-full w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="h-3 w-20 bg-gray-100 rounded mt-2" />
            </div>
          </div>
          {/* Right: Amount + Hash */}
          <div className="flex flex-col items-end gap-2 min-w-[120px]">
            <div className="h-4 w-16 bg-gray-200 rounded" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
