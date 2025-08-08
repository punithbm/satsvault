"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { CopySimple } from "@phosphor-icons/react";

interface CopyIconProps {
  text: string;
  className?: string;
  size?: number;
}

export const CopyIcon: React.FC<CopyIconProps> = ({
  text,
  className = "",
  size = 20,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success("Copied to clipboard");

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast.error("Failed to copy");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`transition-all duration-200 ease-in-out ${className}`}
      aria-label="Copy to clipboard"
      title={isCopied ? "Copied!" : "Copy to clipboard"}
    >
      {isCopied ? (
        <Check className="h-[20px] w-[20px] text-green-500" strokeWidth={2} />
      ) : (
        <CopySimple
          className="text-gray-500 hover:text-gray-700"
          color="#919191"
          size={size}
          weight="duotone"
        />
      )}
    </button>
  );
};
