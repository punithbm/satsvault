import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import crypto from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const truncateAddress = (address: string, toDisplayLength: number = 6, endLength: number = 4) => {
  return `${address.slice(0, toDisplayLength)}...${address.slice(-endLength)}`;
};

export const covertSatsToBtc = (sats: number) => {
  return sats * 1e-8;
};

export const sanitizeAmount = (amount: string): string => {
  // Remove any non-numeric characters except for decimal point
  const sanitized = amount.replace(/[^0-9.]/g, "");

  // Ensure only one decimal point
  const parts = sanitized.split(".");
  const integerPart = parts[0] || "0";
  const decimalPart = parts.length > 1 ? parts[1].slice(0, 8) : "";

  // Combine integer and decimal parts
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
};

export function doubleSHA256(data: any) {
  return crypto.createHash("sha256").update(crypto.createHash("sha256").update(data).digest()).digest();
}

export function hexToUint8Array(hex: string): Uint8Array {
  if (hex.startsWith("0x")) {
    hex = hex.slice(2);
  }
  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < array.length; i++) {
    array[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return array;
}

export function btcToSatoshi(btc: number): number {
  const satoshiPerBtc = 100_000_000; // 1 BTC = 100,000,000 Satoshi
  return btc * satoshiPerBtc;
}

export async function getWalletBalance(btcAddress: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_DVAULT_BASE_URL;
    const url = `${baseUrl}/get-balance`;
    const response = await fetch(`${url}?btcAddress=${encodeURIComponent(btcAddress)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch balance:", error);
    return null;
  }
}

export async function getTxDetails(txid: string): Promise<any> {
  try {
    const url = `https://evm.api.exp.surge.dev/api/v2/transactions/${txid}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch tx details:", error);
    throw error;
  }
}

export async function getAddress(btcAddressHash: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_DVAULT_BASE_URL;
    const response = await fetch(`${baseUrl}/get-address?btcAddressHash=${encodeURIComponent(btcAddressHash)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error("Error fetching address:", error);
  }
}
