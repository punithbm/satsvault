import { useRouter } from "next/navigation";
import { useBtcWallet } from "@/lib/context/WalletContext";
import { toast } from "sonner";

interface ActionCardProps {
  title: string;
  description: string;
  icon: any;
  action: string;
  disabled?: boolean;
}

export default function ActionCard({ title, description, icon, action, disabled = false }: ActionCardProps) {
  const router = useRouter();
  const { isConnected, checkCookieValidity } = useBtcWallet();

  const handleClick = () => {
    if (disabled) {
      toast.error("This feature is currently disabled");
      return;
    }

    // Check if the route requires wallet connection
    const protectedRoutes = ["/deposit", "/withdraw", "/send", "/transactions", "/autopay", "/policies"];
    const isProtectedRoute = protectedRoutes.some((route) => action.startsWith(route));

    if (isProtectedRoute) {
      if (!isConnected) {
        toast.error("Please connect your wallet first");
        return;
      }
      // Check if cookie is still valid before navigation
      if (!checkCookieValidity()) {
        return; // checkCookieValidity already shows error toast
      }
    }

    router.push(action);
  };

  return (
    <button className={`w-full px-4 py-6 bg-grey-50 rounded-md flex items-center gap-x-3 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`} onClick={handleClick} disabled={disabled}>
      {icon}
      <div className="flex flex-col gap-y-1 items-start text-start">
        <p className={`text-sm-semibold leading-[140%] tracking-[3%] ${disabled ? "text-grey-400" : "text-grey-600"}`}>{title}</p>
        <p className="text-sm text-grey-400 leading-[150%]">{description}</p>
      </div>
    </button>
  );
}
