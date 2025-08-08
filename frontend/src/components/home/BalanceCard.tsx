import { useBtcWallet } from "@/lib/context/WalletContext";
import { CopyIcon } from "../shared/CopyIcon";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchBalance } from "@/hooks/swr";
import { getWalletBalance } from "@/lib/utils";
import Wallet, { AddressPurpose, MessageSigningProtocols } from "sats-connect";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import useQRCodeStyling from "@/hooks/useQRCodesStyling";

function truncateMiddle(address: string, start = 8, end = 8) {
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export default function BalanceCard({ btcAddress, balance }: { btcAddress: string; balance?: number }) {
  const router = useRouter();
  const { balance: walletBalance, setSatsBalance } = useWalletBalance(btcAddress);
  const qrRef = useRef<HTMLDivElement>(null);

  const qrOptions = useMemo(
    () => ({
      width: 56,
      height: 56,
      type: "svg" as const,
      data: btcAddress || "",
      margin: 2,
      qrOptions: { errorCorrectionLevel: "M" as const },
      dotsOptions: {
        type: "rounded" as const,
        color: "#ffffff",
        gradient: undefined,
      },
      cornersSquareOptions: {
        type: "extra-rounded" as const,
        color: "#ffffff",
      },
      cornersDotOptions: {
        type: "dot" as const,
        color: "#ffffff",
      },
      backgroundOptions: {
        color: "transparent",
        round: 1,
      },
    }),
    [btcAddress]
  );
  const qrCode = useQRCodeStyling(qrOptions);

  const chunkLines = useMemo(() => {
    if (!btcAddress) return [] as string[];
    const chunks: string[] = [];
    for (let i = 0; i < btcAddress.length; i += 10) {
      chunks.push(btcAddress.slice(i, i + 10));
      if (chunks.length >= 3) break; // fewer lines with wider chunks
    }
    return chunks;
  }, [btcAddress]);

  useEffect(() => {
    async function fetchData() {
      if (btcAddress) {
        const walletBalanceData = await getWalletBalance(btcAddress as string);
        if (walletBalanceData && walletBalanceData.data) {
          if (walletBalanceData.data.status) {
            setSatsBalance(walletBalanceData.data.data);
          } else {
            setSatsBalance(0);
          }
        }
      }
    }
    fetchData();
  }, [btcAddress, balance]);

  // Mount QR
  useEffect(() => {
    if (qrRef.current && qrCode) {
      qrRef.current.innerHTML = "";
      qrCode.append(qrRef.current);
    }
  }, [qrCode]);

  return (
    <div className="w-full h-36 bg-gradient-to-br from-slate-900 via-slate-800 to-black rounded-md px-4 pt-6 pb-3 flex flex-col gap-y-[30px] items-start relative shadow-md">
      {/* QR + Address top-right */}
      <div className="absolute right-3 top-3 flex items-start gap-0 rounded-xl">
        <div ref={qrRef} className="-mt-1" />
        <div className="text-gray-400 text-[11px] font-mono">
          {chunkLines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>
      <p className="text-sm-medium text-grey-400">WALLET</p>
      <div className="flex items-end justify-between w-full mt-4">
        <div className="flex items-end gap-1 w-full justify-start">
          <span className="headingBalance text-white">{walletBalance === 0 ? "0.00" : Number(walletBalance)?.toFixed(walletBalance > 1 ? 4 : 4)}</span>
          <span className="headingBalanceSmall text-grey-400 self-end">BTC</span>
        </div>
        <Button variant="secondary" className="px-5 py-2 rounded-full" onClick={() => router.push("/deposit")}>
          LOAD
        </Button>
      </div>
    </div>
  );
}
