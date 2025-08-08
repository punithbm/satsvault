import { useState, FC } from "react";
import {
  CheckCircle,
  Copy,
  ArrowSquareOut,
  Shield,
  ArrowUpRight,
  ShieldCheck,
  CaretDown,
} from "@phosphor-icons/react";
import { CopyIcon } from "../shared/CopyIcon";
import { btcToSatoshi, truncateAddress } from "@/lib/utils";
import {
  convertTimestampToLocalTime,
  formatTimestampToLocal,
} from "@/lib/utils/index";
import Link from "next/link";

export interface DecodedInputParameter {
  name: string;
  type: string;
  value: string;
}

export interface DecodedInput {
  method_call: string;
  method_id: string;
  parameters: DecodedInputParameter[];
}

interface TxDetailProps {
  txDetails: {
    hash: string;
    result: string;
    method: string;
    block_number: number | string;
    timestamp: string;
    decoded_input: DecodedInput;
    to: any;
    raw_input: string;
  };
  btcFromAddress: string;
  btcToAddress: string;
  btcAmount: string;
}

const TxDetail: FC<TxDetailProps> = ({
  txDetails,
  btcFromAddress,
  btcToAddress,
  btcAmount,
}) => {
  if (!txDetails) return null;
  console.log(txDetails);
  console.log(btcFromAddress);
  console.log(btcToAddress);
  console.log(btcAmount);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="bg-grey-50 rounded-xl pl-[18px] pb-8 pt-6 pr-4  w-full max-w-[432px]">
      <div className="flex flex-col gap-5">
        {/* Hash */}
        {txDetails.hash && (
          <div className="flex items-center justify-between">
            <span className="text-grey-500 text-sm-normal">Hash</span>
            <span className="flex items-center gap-1 text-sm-normal uppercase text-grey-400">
              {truncateAddress(txDetails.hash)}
              <CopyIcon text={txDetails.hash} />
            </span>
          </div>
        )}

        {/* Status */}
        {txDetails.result && (
          <div className="flex items-center justify-between">
            <span className="text-grey-500 text-sm-normal">Status</span>
            <span className="flex items-center gap-2 px-2 py-1 rounded-lg bg-[#44AF6B]/10">
              <CheckCircle size={18} color="#22c55e" weight="fill" />
              <span className="text-[#44AF6B] text-sm-normal font-medium capitalize">
                {txDetails.result}
              </span>
            </span>
          </div>
        )}
        {/* Type */}
        {txDetails.method && (
          <div className="flex items-center justify-between">
            <span className="text-grey-500 text-sm-normal">Type</span>
            <span className="flex items-center gap-2 px-2 py-1 rounded-lg bg-grey-500/10">
              <ArrowUpRight size={16} weight="duotone" />
              <span className="text-sm-normal text-grey-500 capitalize">
                {txDetails.method}
              </span>
            </span>
          </div>
        )}
        {/* Block */}
        {txDetails.block_number && (
          <div className="flex items-center justify-between">
            <span className="text-grey-500 text-sm-normal">Block</span>
            <Link
              href={`https://evm.exp.surge.dev/block/${txDetails.block_number}`}
              target="_blank"
              className="text-sm-normal text-grey-400 underline underline-offset-1"
            >
              {txDetails.block_number}
            </Link>
          </div>
        )}
        {/* Timestamp */}
        {txDetails.timestamp && (
          <div className="flex items-center justify-between">
            <span className="text-grey-500 text-sm-normal">Timestamp</span>
            <span className="text-sm-normal text-grey-400">
              {formatTimestampToLocal(txDetails.timestamp)}
            </span>
          </div>
        )}
        <hr className="my-3 border-grey-300 border-dashed" />
        {/* From */}
        {btcFromAddress && (
          <div className="flex items-center justify-between">
            <span className="text-grey-500 text-sm-normal">From</span>
            <span className="flex items-center gap-1 text-sm-normal text-grey-400">
              {truncateAddress(btcFromAddress)}
              <CopyIcon text={btcFromAddress} />
            </span>
          </div>
        )}
        {/* To */}
        {btcToAddress && (
          <div className="flex items-center justify-between">
            <span className="text-grey-500 text-sm-normal">To</span>
            <span className="flex items-center gap-1 text-sm-normal text-grey-400">
              {truncateAddress(btcToAddress)}
              <CopyIcon text={btcToAddress} />
            </span>
          </div>
        )}
        {/* Amount */}
        {btcAmount && (
          <div className="flex items-center justify-between">
            <span className="text-grey-500 text-sm-normal">Amount</span>
            <span className="text-sm-medium text-grey-400">
              <span className="text-grey-500 text-sm-medium">
                {Number(btcAmount) * 1e-8} BTC
              </span>{" "}
              <span className="text-grey-500 text-sm-medium">
                ({btcAmount} Sats)
              </span>
            </span>
          </div>
        )}
        {/* Interacted Contract */}
        {txDetails.to.name && (
          <div className="flex items-center justify-between">
            <span className="text-grey-500 text-sm-normal">
              Interacted Contract
            </span>
            <span className="flex items-center gap-2 px-2 py-1 rounded-lg bg-[#FF6431]/10">
              <ShieldCheck size={16} weight="duotone" color="#FF6431" />
              <span className="text-[#FF6431] text-sm-normal font-medium capitalize">
                {txDetails.to.name ?? ""}
              </span>
            </span>
          </div>
        )}
      </div>
      <div className="w-full flex justify-center mt-4">
        <button
          className="text-orangeSecondary text-sm-medium flex items-center gap-2 text-center"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? "Less Details" : "More Details"}
          <CaretDown
            size={16}
            color="#FF6431"
            className={`${
              showDetails ? "rotate-180" : ""
            } transition-all duration-300 ease-in-out`}
          />
        </button>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden mt-4  ${
          showDetails
            ? "max-h-fit opacity-100"
            : "max-h-0 opacity-0 pointer-events-none"
        }`}
        aria-hidden={!showDetails}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm-normal text-grey-500">Raw Input</p>
          <CopyIcon text={txDetails.raw_input} />
        </div>
        <div className="bg-grey-200 rounded-sm p-4 break-all whitespace-pre-wrap">
          {txDetails.raw_input && (
            <p className="text-sm-normal text-grey-500">
              {txDetails.raw_input}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TxDetail;
