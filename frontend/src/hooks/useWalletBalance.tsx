import { useCallback, useEffect, useRef, useState } from "react";
import { getWalletBalance } from "../lib/utils";

/**
 * Hook to fetch and persist the wallet balance for the SatsVault wallet.
 * Prevents flicker to zero between RPC requests.
 */
/**
 * useWalletBalance: Simple getter and setter for wallet balance using persistent memory (localStorage).
 * No fetching logic. Exposes balance, setBalance, and clearBalance.
 */
export function useWalletBalance(walletAddress?: string) {
  const [balance, setBalance] = useState<number>(0);

  // Helper for unique storage key
  const getStorageKey = (address?: string) =>
    address ? `walletBalance:${address}` : "walletBalance:unknown";

  // Load balance from localStorage on mount or when walletAddress changes
  useEffect(() => {
    if (!walletAddress) return;
    const key = getStorageKey(walletAddress);
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      const parsed = parseFloat(stored);
      setBalance(!isNaN(parsed) ? parsed : 0);
    } else {
      setBalance(0);
    }
  }, [walletAddress]);

  // Setter that updates both state and localStorage
  const setSatsBalance = (value: number) => {
    if (!walletAddress) return;
    setBalance(value);
    localStorage.setItem(getStorageKey(walletAddress), value.toString());
  };

  // Clear balance for current wallet
  const clearSatsBalance = () => {
    if (!walletAddress) return;
    localStorage.removeItem(getStorageKey(walletAddress));
    setSatsBalance(0);
  };

  return {
    balance,
    setSatsBalance,
    clearSatsBalance,
  };
}
