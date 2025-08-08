import { CaretLeft } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();
  return (
    <button className="flex items-center" onClick={() => router.back()}>
      <CaretLeft size={20} color="#919191" weight="duotone" />
      <span className="cursor-pointer text-base font-bold text-grey-400 font-sans">
        Back
      </span>
    </button>
  );
}
