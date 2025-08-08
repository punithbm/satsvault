"use client";

import React, { useEffect, useState } from "react";

import { useBtcWallet } from "@/lib/context/WalletContext";
import GetStarted from "@/components/home/GetStarted";
import Homepage from "@/components/home/Homepage";

export default function Home() {
  const { walletAddress, btcAddress } = useBtcWallet();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return null;
  }
  return (
    <div className="gap-4 h-full flex w-full pt-[80px] lg:pt-[144px] items-start justify-center">
      {walletAddress ? (
        <Homepage btcAddress={btcAddress || ""} />
      ) : (
        <GetStarted />
      )}
    </div>
  );
}
