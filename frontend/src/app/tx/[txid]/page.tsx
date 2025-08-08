"use client";
import React, { useEffect, useState } from "react";
import "@/app/globals.css";
import { Button } from "@/components/ui/button";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useBtcWallet } from "@/lib/context/WalletContext";
import { convertTimestampToLocalTime, satsToBtc } from "@/lib/utils/index";
import { getAddress, truncateAddress } from "@/lib/utils";
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
import { getTxDetails } from "@/lib/utils";
import TxDetail from "@/components/tx-detail/TxDetail";

export default function TxPage() {
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [txDetails, setTxDetails] = useState<any>(null);
  const [btcFromAddress, setBtcFromAddress] = useState<string>("");
  const [btcToAddress, setBtcToAddress] = useState<string>("");
  const [btcAmount, setBtcAmount] = useState<string>("");

  useEffect(() => {
    if (params.txid) {
      const fetchTxDetails = async () => {
        try {
          setLoading(true);
          console.log(params.txid);
          const txDetails = await getTxDetails(params.txid as string);

          const fromAddress =
            txDetails.decoded_input.parameters.filter(
              (param: any) => param.name === "fromBTCAddressHash"
            )[0].value ?? "";
          const toAddress =
            txDetails.decoded_input.parameters.filter(
              (param: any) => param.name === "toBTCAddressHash"
            )[0].value ?? "";
          const amount =
            txDetails.decoded_input.parameters.filter(
              (param: any) => param.name === "amount"
            )[0].value ?? 0;

          const fromBtcAddress = await getAddress(fromAddress);
          const toBtcAddress = await getAddress(toAddress);
          setTxDetails(txDetails);
          setBtcFromAddress(fromBtcAddress.data.btcAddress);
          setBtcToAddress(toBtcAddress.data.btcAddress);
          setBtcAmount(amount);
          console.log("Tx details:", txDetails);
          setLoading(false);
        } catch (error) {
          console.error("Error fetching tx details:", error);
          setLoading(false);
        }
      };
      fetchTxDetails();
    }
  }, [params.txid]);

  return (
    <div className="w-full max-w-[454px] mx-auto lg:pt-[136px] pt-[100px] pb-8">
      {/* Back Button */}
      <BackButton />
      {/* Heading */}
      <p className="lg:text-5xl text-3xl font-medium tracking-tight leading-[100%] text-black my-7 font-sans">
        Txn Details
      </p>
      {loading ? (
        <TxDetailSkeleton />
      ) : (
        <TxDetail
          txDetails={txDetails}
          btcFromAddress={btcFromAddress}
          btcToAddress={btcToAddress}
          btcAmount={btcAmount}
        />
      )}
    </div>
  );
}

const TxDetailSkeleton = () => (
  <div className="bg-grey-50 rounded-xl pl-[18px] pb-8 pt-6 pr-4 w-full max-w-[432px] animate-pulse">
    <div className="flex flex-col gap-5">
      {[...Array(6)].map((_, i) => (
        <div className="flex items-center justify-between" key={i}>
          <div className="h-4 w-24 bg-grey-200 rounded" />
          <div className="h-4 w-40 bg-grey-200 rounded" />
        </div>
      ))}
    </div>
  </div>
);
