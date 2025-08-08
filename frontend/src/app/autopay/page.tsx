"use client";
import BackButton from "@/components/shared/BackButton";
import { CopyIcon } from "@/components/shared/CopyIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useBtcWallet } from "@/lib/context/WalletContext";
import { truncateAddress } from "@/lib/utils";
import { useEffect, useState } from "react";
import { signMessageWithPorto } from "@/lib/porto-utils";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, X } from "lucide-react";
//@ts-ignore
import Tag from "@/components/shared/Tags";
import { satsToBtc } from "@/lib/utils/index";
// import { TxDetailSkeleton } from "../tx/[txid]/page";

const numberRegex = /^\d*\.?\d*$/;

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

interface FormData {
  amount: string;
  toAddress: string;
  frequency: string;
  label: string;
}

const frequencyMap = {
  "300": "5 minutes",
  "600": "10 minutes",
  "900": "15 minutes",
  "1800": "30 minutes",
};

function convertTimestampToLocalTime(timestamp: string | number | Date) {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(date);
}

export default function Autopayments() {
  const { btcAddress: senderAddress } = useBtcWallet();
  const [activeTab, setActiveTab] = useState("create");
  const [loading, setLoading] = useState(true);
  const [activePayments, setActivePayments] = useState<any[]>([]);
  const [cancelledPayments, setCancelledPayments] = useState<any[]>([]);

  const fetchAutopayData = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_DVAULT_BASE_URL}/get-auto-payments?btcAddress=${senderAddress}`
      );
      const result = await response.json();
      console.log("Autopay data fetched successfully:", result.data);
      if (response.ok) {
        setLoading(false);
        console.log("Autopay data fetched successfully:", result.data);
        const activePayments = result.data.filter(
          (payment: any) => payment.status
        );
        const cancelledPayments = result.data.filter(
          (payment: any) => !payment.status
        );
        setActivePayments(activePayments);
        setCancelledPayments(cancelledPayments);
      } else {
        setLoading(false);
        console.error("Error fetching autopay data:", result.message);
      }
      return result;
    } catch (error) {
      setLoading(false);
      console.error("Network error:", error);
    }
  };

  useEffect(() => {
    if (!senderAddress) return;
    fetchAutopayData();
  }, [senderAddress]);

  const handleCancelUpdate = (id: string) => {
    const canceledPayment = activePayments.find((payment) => payment.id === id);
    const updatedActivePayments = activePayments.filter(
      (payment) => payment.id !== id
    );
    const updatedCancelledPayments = [canceledPayment, ...cancelledPayments];
    setActivePayments(updatedActivePayments);
    setCancelledPayments(updatedCancelledPayments);
    setActiveTab("cancelled");
  };

  return (
    <>
      <div className="h-full text-black font-mono relative w-full lg:pt-[136px] pt-[100px] text-start flex flex-col justify-between ">
        <div className="w-full h-full">
          <BackButton />
          <div className="flex flex-col items-start  space-y-6 h-full w-full ">
            <p className="lg:text-5xl text-3xl font-medium tracking-tight leading-[100%] text-grey-700 mt-7 mb-5 font-sans">
              Autopay <br />
            </p>
            <p className="text-grey-400 text-sm font-normal lg:text-lg lg:leading-[100%] tracking-tight !mt-0 font-sans">
              Automatically send recurring Bitcoin payments on your schedule
            </p>
            {/* Tabs */}
            <div className="flex space-x-4 mb-4 text-center">
              <button
                className={`px-4 py-1 text-sm border-b-2 ${
                  activeTab === "create"
                    ? "border-orangeSecondary text-orangeSecondary font-semibold"
                    : "border-transparent text-grey-400 font-normal"
                }`}
                onClick={() => setActiveTab("create")}
              >
                Create
              </button>
              <button
                className={`px-4 py-1 text-sm border-b-2 ${
                  activeTab === "active"
                    ? "border-orangeSecondary text-orangeSecondary font-semibold"
                    : "border-transparent text-grey-400 font-normal"
                }`}
                onClick={() => setActiveTab("active")}
              >
                Active
              </button>
              <button
                className={`px-4 py-1 text-sm border-b-2 ${
                  activeTab === "cancelled"
                    ? "border-orangeSecondary text-orangeSecondary font-semibold"
                    : "border-transparent text-grey-400 font-normal"
                }`}
                onClick={() => setActiveTab("cancelled")}
              >
                Cancelled
              </button>
            </div>
            {/* Tab Content */}
            {activeTab === "create" && (
              <PaymentForm fetchAutopayData={fetchAutopayData} />
            )}
            {activeTab === "active" &&
              (loading ? (
                <TxDetailSkeleton />
              ) : (
                <ActivePayments
                  activePayments={activePayments}
                  handleCancelUpdate={handleCancelUpdate}
                />
              ))}
            {activeTab === "cancelled" &&
              (loading ? (
                <TxDetailSkeleton />
              ) : (
                <CancelledPayments cancelledPayments={cancelledPayments} />
              ))}
          </div>
        </div>
      </div>
    </>
  );
}

function PaymentForm({
  fetchAutopayData,
}: {
  fetchAutopayData: () => Promise<any>;
}) {
  const { btcAddress: senderAddress } = useBtcWallet();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    amount: "",
    toAddress: "",
    frequency: "300",
    label: "",
  });

  const autopaySchema = z.object({
    amount: z
      .string()
      .min(1, "Amount is required")
      .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: "Amount must be a positive number",
      }),
    toAddress: z
      .string()
      .min(1, "BTC Address is required")
      .regex(
        /^tb1[qp][a-z0-9]{38,60}$/,
        "Invalid testnet BTC address (must start with tb1p or tb1q)"
      ),
    frequency: z.enum(["300", "600", "900", "1800"]),
    label: z.string().min(1, "Label is required"),
  });

  async function setupRecurringPayment(data: any) {
    const amount = Number(formData.amount);
    const frequency = Number(formData.frequency);
    const { btcAddress, message, signature } = data;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_DVAULT_BASE_URL;
      const response = await fetch(`${baseUrl}/setup-recurring-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          btcAddress,
          toAddress: formData.toAddress,
          amount,
          frequency,
          message,
          signature,
          label: formData.label,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();

      if (result.status) {
        const payments = await fetchAutopayData();
        setLoading(false);
        clearForm();
        toast.success("Recurring payment setup successfully");
      } else {
        toast.error("Failed to setup recurring payment");
      }
      return result;
    } catch (error) {
      setLoading(false);
      clearForm();
      console.error("Error setting up recurring payment:", error);
      throw error;
    }
  }

  const clearForm = () => {
    setFormData({
      amount: "",
      toAddress: "",
      frequency: "300",
      label: "",
    });
  };

  const handleSubmit = async () => {
    const autopayResult = autopaySchema.safeParse(formData);
    if (!autopayResult.success) {
      toast.error(autopayResult.error.errors[0].message);
      return;
    }
    setLoading(true);
    const msg = "Signing this message to confirm a recurring payment.";
    try {
      const signResult = await signMessageWithPorto(msg);
      setupRecurringPayment({
        btcAddress: senderAddress as string,
        message: msg,
        signature: signResult.signature,
      });
    } catch (error) {
      console.error("Message signing failed:", error);
      setLoading(false);
      return;
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const areAllFieldsFilled = (formData: FormData) => {
    return Object.values(formData).every((value) => value.trim() !== "");
  };

  return (
    <div className="w-full h-full">
      <div className="flex flex-col items-start space-y-5 h-full w-full ">
        <div className="flex flex-col space-y-2 w-full">
          <label
            htmlFor="btcVal"
            className="pl-4 text-grey-400 text-sm-semibold pb-0.5"
          >
            BTC VALUE
          </label>
          <Input
            type="text"
            name="amount"
            value={formData.amount}
            onChange={(e) => {
              if (numberRegex.test(e.target.value)) {
                handleInputChange(e);
              }
            }}
            placeholder="Enter BTC Value"
            className="relative  w-full"
          />
        </div>
        <div className="flex flex-col space-y-2 w-full">
          <label
            htmlFor="recipientAddress"
            className="pl-4 text-grey-400 text-sm-semibold pb-0.5"
          >
            RECEIVER ADDRESS
          </label>
          <Input
            type="text"
            name="toAddress"
            value={formData.toAddress}
            onChange={handleInputChange}
            placeholder="Enter BTC Address"
            className="relative  w-full"
          />
        </div>
        <div className="flex flex-col space-y-2 w-full">
          <label
            htmlFor="frequency"
            className="pl-4 text-grey-400 text-sm-semibold pb-0.5"
          >
            FREQUENCY
          </label>
          <Select
            name="frequency"
            value={formData.frequency}
            onChange={(e) => {
              handleInputChange(e);
            }}
            className="relative w-full"
          >
            <option value="300">5 minutes</option>
            <option value="600">10 minutes</option>
            <option value="900">15 minutes</option>
            <option value="1800">30 minutes</option>
          </Select>
        </div>
        <div className="flex flex-col space-y-2 w-full">
          <label
            htmlFor="label"
            className="pl-4 text-grey-400 text-sm-semibold pb-0.5"
          >
            ADD LABEL
          </label>
          <Input
            name="label"
            type="text"
            value={formData.label}
            onChange={(e) => {
              handleInputChange(e);
            }}
            placeholder="Ex: Netflix Home TV"
            className="relative  w-full"
          />
        </div>
        <div className="w-full flex justify-center relative top-10">
          <Button
            onClick={handleSubmit}
            disabled={!areAllFieldsFilled(formData) || loading}
            className="w-full lg:text-[20px] text-[16px] leading-[140%] tracking-wide rounded-full text-white font-bold mb-5"
          >
            {loading ? "Processing..." : "Sign request"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PaymentCard({
  paymentData,
  hideCancel,
  hideActiveTag,
  handleCancelUpdate,
}: {
  paymentData: any;
  hideCancel?: boolean;
  hideActiveTag?: boolean;
  handleCancelUpdate?: (id: string) => void;
}) {
  const { btcAddress: senderAddress } = useBtcWallet();
  const [loading, setLoading] = useState(false);
  const { label, amount, to, frequency } = paymentData;

  const cancelRecurringPayment = async ({
    btcAddress,
    message,
    signature,
    id,
  }: {
    btcAddress: string;
    message: string;
    signature: string;
    id: string;
  }) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_DVAULT_BASE_URL;
      const response = await fetch(`${baseUrl}/cancel-auto-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          btcAddress,
          message,
          signature,
          id,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      if (result.status) {
        handleCancelUpdate?.(id);
        toast.success("Recurring payment cancelled successfully");
      } else {
        toast.error("Failed to cancel recurring payment");
      }
      setLoading(false);
      return result;
    } catch (error) {
      console.error("Failed to cancel recurring payment:", error);
      toast.error("Failed to cancel recurring payment");
      setLoading(false);
      return null;
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    const message = `Signing this message to cancel the ${paymentData.label} autopayments`;
    try {
      const signResult = await signMessageWithPorto(message);
      cancelRecurringPayment({
        btcAddress: senderAddress as string,
        message: message,
        signature: signResult.signature,
        id: paymentData.id,
      });
    } catch (error) {
      console.error("Message signing failed:", error);
      setLoading(false);
      return;
    }
  };

  return (
    <div className="bg-[#F4F4F4] p-4 rounded-lg font-sans mb-4">
      <div className="grid grid-cols-12 gap-x-4 gap-y-4 relative">
        {!hideActiveTag && (
          <Tag variant="success" className="absolute top-[-8px] right-[-4px]">
            Active
          </Tag>
        )}
        <span className="col-span-4 text-[#5F5F5F] text-sm">Name</span>
        <span className="col-span-8 text-[#919191] text-sm">{label}</span>
        <span className="col-span-4 text-[#5F5F5F] text-sm">To</span>
        <span className="col-span-8 relative pr-5 text-[#919191] text-sm">
          {truncateAddress(to, 12, 12)}
          <CopyIcon
            className="absolute top-[1px] right-0"
            text={to || ""}
            size={16}
          />
        </span>
        <span className="col-span-4 text-[#5F5F5F] text-sm">Amount</span>
        <span className="col-span-8 text-[##5F5F5F] text-sm font-medium">
          {satsToBtc(amount)}BTC ({amount} Sats)
        </span>

        <span className="col-span-4 text-[#5F5F5F] text-sm">Frequency</span>
        <span className="col-span-8 text-[#919191] text-sm">
          {frequencyMap[frequency as keyof typeof frequencyMap]}
        </span>

        <span className="col-span-4 text-[#5F5F5F] text-sm">Created on</span>
        <span className="col-span-8 text-[#919191] text-sm">
          {convertTimestampToLocalTime(paymentData.created_at)}
        </span>
      </div>
      {!hideCancel && (
        <div className="w-full flex justify-center mt-4">
          {loading ? (
            <span className="text-grey-500 text-sm">Please wait...</span>
          ) : (
            <Button
              onClick={handleCancel}
              className="text-[#DF3232] bg-transparent space-x-1 capitalize font-normal hover:bg-transparent hover:text-[#DF3232]"
            >
              <X className="rounded-full border border-[#DF3232] " /> Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ActivePayments({
  activePayments,
  handleCancelUpdate,
}: {
  activePayments: any[];
  handleCancelUpdate: (id: string) => void;
}) {
  return (
    <div
      key={"activePayments"}
      className="w-full h-[calc(100%-200px)] overflow-y-auto"
    >
      {activePayments.length === 0 ? (
        <div className="w-full h-full flex items-start justify-center font-sans text-grey-400 pt-10">
          Seems you have no active payments
        </div>
      ) : (
        activePayments.map((payment: any) => (
          <PaymentCard
            key={payment.uuid}
            paymentData={payment}
            hideCancel={false}
            hideActiveTag={false}
            handleCancelUpdate={handleCancelUpdate}
          />
        ))
      )}
    </div>
  );
}

function CancelledPayments({
  cancelledPayments,
}: {
  cancelledPayments: any[];
}) {
  const paymentData = {
    id: "12345",
    amount: "0.01 BTC",
    recipient: "tb1pf7mc6tujgxrq96md0zwypf9xvkvn4s0rkfharctd42f0yqgxfqzqmzf4z9",
    frequency: "Monthly",
    status: "Cancelled",
  };

  return (
    <div className="w-full h-full">
      {cancelledPayments.length === 0 ? (
        <div className="w-full h-full flex items-start justify-center font-sans text-grey-400 pt-10">
          Seems you have no cancelled payments
        </div>
      ) : (
        cancelledPayments.map((payment: any) => (
          <PaymentCard
            key={payment.uuid}
            paymentData={payment}
            hideCancel={true}
            hideActiveTag={true}
          />
        ))
      )}
    </div>
  );
}
