import React from "react";

interface TagProps {
  variant: "success" | "warning" | "error";
  className?: string;
  children: React.ReactNode;
}

const tagStyles = {
  success: "bg-[#44AF6B1A] text-[#44AF6B]",
  warning: "bg-[#FFC1071A] text-[#FFC107]",
  error: "bg-[#FF00001A] text-[#FF0000]",
};

const svg = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-circle-check-icon lucide-circle-check"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export default function Tag({ variant, className, children }: TagProps) {
  return (
    <span
      className={`px-2 py-1 rounded-[6px] text-sm font-medium flex items-center gap-x-1 ${tagStyles[variant]} ${className}`}
    >
      {variant === "success" && svg}
      {children}
    </span>
  );
}
