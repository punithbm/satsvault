"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useBtcWallet } from "../../lib/context/WalletContext";
import { CopyIcon } from "./CopyIcon";

import { cn, truncateAddress } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { LinkBreak } from "@phosphor-icons/react";
import Image from "next/image";
import { icons } from "@/lib/utils/images";
import { useWalletBalance } from "@/hooks/useWalletBalance";

const Header = () => {
  const { walletAddress, btcAddress, connect, disconnect } = useBtcWallet();
  const { clearSatsBalance } = useWalletBalance(btcAddress ?? "");
  const router = useRouter();

  const handleDisconnect = async () => {
    disconnect();
    clearSatsBalance();
    router.push("/");
  };

  return (
    <header className="w-full fixed top-0 lg:max-w-[432px] left-1/2 -translate-x-1/2 z-50 lg:pt-16 pt-5 pb-2 lg:pb-0 bg-white px-[11px] lg:px-0">
      <div
        className={cn(
          "flex items-center justify-between w-full",
          !walletAddress && "justify-center"
        )}
      >
        <Link
          href="/"
          className={cn("flex items-center", !walletAddress && "text-center")}
        >
          <h1 className="headingBold text-orangeSecondary">SatsVault</h1>
        </Link>
        {walletAddress && (
          <div className="flex items-center gap-x-1">
            <div className="flex items-center space-x-1 rounded-md bg-grey-100 ">
              <div className="px-2 py-[10px] flex items-center gap-0.5">
                <p className="text-grey-500 text-sm-medium">
                  {truncateAddress(btcAddress || "")}
                </p>
                <CopyIcon text={btcAddress || ""} />
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              className="p-2 bg-orangeSecondary/10 text-white rounded-md hover:bg-orangeSecondary/20 transition-colors group"
            >
              <Image
                src={icons.linkBreak.src}
                width={24}
                height={24}
                alt="Disconnect"
              />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
