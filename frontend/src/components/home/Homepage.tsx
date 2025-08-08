import { Button } from "../ui/button";
import BalanceCard from "./BalanceCard";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ClockCounterClockwise, HandWithdraw, Repeat, Shield } from "@phosphor-icons/react";
import ActionCard from "./ActionCard";

export default function Homepage({ btcAddress }: { btcAddress: string }) {
  const router = useRouter();

  return (
    <div className="w-full h-full text-center max-w-[432px]">
      <BalanceCard btcAddress={btcAddress} />
      <div className="mt-12 flex flex-col w-full gap-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm-semibold text-orangeSecondary">ACTIONS</p>
          <button className="flex items-center gap-x-1" onClick={() => router.push("/transactions")}>
            <ClockCounterClockwise size={18} color="#919191" weight="duotone" />
            <p className="text-sm-medium leading-[5%] text-gray-400">HISTORY</p>
          </button>
        </div>
        <ActionCard title="SEND" description="Blazing fast transfers be it 1BTC or 0.0001BTC with the lowest gas fees" icon={<ArrowUpRight size={40} color="#919191" weight="duotone" />} action="/send" />
        <ActionCard title="SET POLICIES" description="Configure conditional wallet rules and policies for enhanced security" icon={<Shield size={40} color="#919191" weight="duotone" />} action="/policies" />
        <ActionCard title="WITHDRAW" description="Get your BTC out of SatsVault to your external wallet" icon={<HandWithdraw size={40} color="#919191" weight="duotone" />} action="/withdraw" />
        <ActionCard title="AUTOPAY / SUBSCRIPTIONS" description="Setup automatic payments to recurring-subscriptions and forget about it" icon={<Repeat size={40} color="#919191" weight="duotone" />} action="/autopay" disabled={true} />
      </div>
    </div>
  );
}

{
  /* <div className="mt-12 flex justify-center items-center gap-6 w-full">
        <Button
          className="bg-red-600 text-white font-mono px-6 py-2 rounded-full text-sm uppercase hover:bg-red-700 transition-colors w-full"
          onClick={() => router.push("/deposit")}
        >
          Load BTC
        </Button>
        <Button
          className="bg-black border border-red-600 text-red-600 font-mono px-6 py-2 rounded-full text-sm uppercase hover:bg-red-700 hover:text-white transition-colors w-full"
          onClick={() => router.push("/transactions")}
        >
          Send BTC
        </Button>
      </div> */
}
