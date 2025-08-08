import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/shared/Header";
import { WalletProvider } from "@/lib/context/WalletContext";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SatsVault",
  description:
    "Do more with your Bitcoin—stake, send, and manage BTC effortlessly with SatsVault.",
  keywords: ["SatsVault", "BTC", "Staking", "Sats"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} font-sans antialiased h-screen bg-white w-full max-w-[454px] px-[11px] mx-auto bg-[url('/images/lines_bg.png')] bg-repeat-y bg-top bg-contain`}
      >
        <WalletProvider>
          <TooltipProvider>
            <Header />
            {children}
            <Toaster />
          </TooltipProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
